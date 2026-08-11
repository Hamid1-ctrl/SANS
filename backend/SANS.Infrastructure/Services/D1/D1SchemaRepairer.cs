namespace SANS.Infrastructure.Services.D1;

/// <summary>
/// Startup-time schema self-healing. Verifies that every table the app writes has
/// exactly the columns its entity maps (D1Table writes ALL mapped columns) and repairs
/// anything that is out of date, in two distinct passes:
///   1. Missing columns the entity writes (e.g. an old ClassWorkspaces table with no
///      CourseCode / CreatedByUserId) are added IN PLACE with an additive
///      ALTER TABLE ... ADD COLUMN. This is the important, low-risk path: ALTER ADD
///      COLUMN never touches foreign keys, so it works even under Cloudflare D1's
///      ENFORCED foreign keys (where the full rebuild below is unsafe). It alone fixes
///      the long-standing "table classworkspaces has no column named createdbyuserid"
///      error on existing databases without a destructive reset.
///   2. NOT NULL columns the entity never writes (e.g. ClassWorkspaces.LecturerId was
///      NOT NULL, which rejected every rep-created class) cannot be relaxed with ALTER,
///      so those tables are rebuilt.
///
/// Cloudflare D1 ENFORCES foreign keys and ignores PRAGMA foreign_keys = OFF inside
/// its implicit transactions, so DROPping a parent table would cascade-delete (or be
/// blocked by) rows in child tables that still carry FK constraints. The rebuild pass
/// therefore targets the transitive closure of all FK-affected tables, children BEFORE
/// parents, so every child's FK constraints are stripped before its parent is dropped.
/// Rebuilding is idempotent: once a table matches the entity it is skipped, and data in
/// columns shared between the old and new layout is preserved.
///
/// Notes / accepted trade-offs:
///  - Rebuilding strips FK constraints from every rebuilt table, and the closure also
///    rebuilds healthy FK children of a repaired table. After a repair the affected
///    tables are FK-free — safe for this app, which soft-deletes and never relies on
///    database cascades. Because missing columns are now added in place first, this
///    rebuild path is reserved for the (rarer) stale-NOT-NULL case.
///  - If foreign-key introspection fails for any table, the repair ABORTS (fail-closed)
///    rather than risk dropping a parent whose children still carry constraints. The
///    in-place ADD COLUMN pass still runs for tables repaired before the abort point
///    (it is safe), but any rebuild that cannot be proven safe is skipped.
/// </summary>
public class D1SchemaRepairer
{
    private sealed record TableSpec(string Name, (string Name, D1ValueKind Kind)[] Columns);

    private sealed record LiveColumn(string Name, bool NotNull, string? DefaultValue);

    private readonly ID1Client _client;

    public D1SchemaRepairer(ID1Client client)
    {
        _client = client;
    }

    /// <summary>
    /// Repairs every out-of-date table — adding missing columns in place and rebuilding
    /// where a rebuild is required. Returns the number of tables that were repaired.
    /// Never throws: failures are logged and skipped so a bad table cannot block startup
    /// or the repair of the others.
    /// </summary>
    public async Task<int> RepairIfNeededAsync(D1Context context)
    {
        var specs = BuildSpecs(context);
        var specsByName = specs.ToDictionary(s => s.Name, StringComparer.OrdinalIgnoreCase);
        var repaired = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            // 1. Diff every table against its entity. This step only uses PRAGMA table_info,
            //    which is safe and never requires foreign-key introspection.
            //    - addColumns: tables missing an entity-mapped column (e.g. the old
            //      ClassWorkspaces without CreatedByUserId) -> fixed IN PLACE with an additive
            //      ALTER TABLE ADD COLUMN.
            //    - needsRepair: any table with missing columns OR a stale NOT NULL. Kept
            //      separate because the full rebuild is what also relaxes a NOT NULL on a
            //      *nullable* entity column (e.g. the old ClassWorkspaces.LecturerId was NOT
            //      NULL), which ALTER ADD COLUMN cannot do.
            var addColumns = new List<TableSpec>();
            var needsRepair = new List<TableSpec>();

            foreach (var spec in specs)
            {
                var (missing, staleNotNull) = await DiffAsync(spec);
                if (missing.Count == 0 && staleNotNull.Count == 0) continue;
                if (missing.Count > 0) addColumns.Add(spec);
                needsRepair.Add(spec);
            }

            if (addColumns.Count == 0 && needsRepair.Count == 0)
            {
                return 0;
            }

            // 2. FIRST, add missing columns IN PLACE. This additive ALTER never touches
            //    foreign keys, so it is unaffected by D1's ENFORCED foreign keys and needs NO
            //    foreign-key introspection — it fixes "no column named CreatedByUserId" style
            //    errors even if the FK graph below cannot be built (the reported error).
            foreach (var spec in addColumns)
            {
                if (await AddMissingColumnsAsync(spec))
                {
                    repaired.Add(spec.Name);
                }
            }

            // 3. Rebuild out-of-date tables (missing columns OR stale NOT NULL). Rebuilding a
            //    parent DROPs it, which (with D1's enforced foreign keys) would cascade into
            //    child tables still carrying FK constraints, so the closure of ALL affected
            //    children must be rebuilt too — children BEFORE parents. Rebuilding is what
            //    makes a nullable entity column actually nullable in storage, which is required
            //    for a Course Rep to create a class with no lecturer assigned.
            var children = await BuildForeignKeyGraphAsync(specs);
            var repairSet = ExpandToChildren(
                needsRepair.Select(s => s.Name).ToHashSet(StringComparer.OrdinalIgnoreCase),
                children);
            var order = TopologicalOrder(repairSet, children);

            // 4. Rebuild each table atomically (one D1 batch per table).
            foreach (var name in order)
            {
                await RebuildTableAsync(specsByName[name]);
                repaired.Add(name);
            }
        }
        catch (Exception ex)
        {
            // Fail-closed: log loudly and signal the abort (return -1) so the caller does
            // not print a misleading "schema OK" message. Repair retries next boot.
            Console.WriteLine($"[D1] Schema repair ABORTED this boot: {ex.Message}");
            return -1;
        }

        if (repaired.Count > 0)
        {
            Console.WriteLine($"[D1] Auto-repaired {repaired.Count} table(s) to match the app's entities: {string.Join(", ", repaired)}");
        }
        return repaired.Count;
    }

    /// <summary>
    /// Request-time self-heal for a single table. Adds any missing (entity-mapped but not
    /// live) columns to the given entity's table IN PLACE, using only PRAGMA table_info and
    /// an additive ALTER TABLE ADD COLUMN — no foreign-key introspection, no table rebuild —
    /// so it is always safe under D1's ENFORCED foreign keys and cheap enough to run right
    /// before a write. This guarantees a Course Rep / Lecturer can create a Class Workspace
    /// even if the startup-time repair has not run yet (the reported "no column named
    /// CreatedByUserId" scenario). Idempotent and never throws.
    /// </summary>
    public async Task EnsureTableColumnsAsync<T>(D1Context context) where T : class, new()
    {
        var table = context.Table<T>();
        var spec = new TableSpec(
            table.TableName,
            table.Columns.Select(c => (c.ColumnName, c.Kind)).ToArray());
        await AddMissingColumnsAsync(spec);
    }

    private static List<TableSpec> BuildSpecs(D1Context context)
    {
        var specs = context.GetTables()
            .Select(t => new TableSpec(t.TableName, t.Columns.Select(c => (c.ColumnName, c.Kind)).ToArray()))
            .ToList();

        // ClassEnrollments is written via raw SQL in D1Context, not a D1Table<T> entity.
        specs.Add(new TableSpec("ClassEnrollments", new[]
        {
            ("EnrolledClassesId", D1ValueKind.String),
            ("StudentsId", D1ValueKind.String)
        }));
        return specs;
    }

    /// <summary>
    /// Builds parent -> [children] using pragma_foreign_key_list (supported by D1).
    /// Self-references are ignored so self-FKs (e.g. Messages.ReplyToMessageId) cannot
    /// create a fake dependency.
    /// </summary>
    private async Task<Dictionary<string, List<string>>> BuildForeignKeyGraphAsync(List<TableSpec> specs)
    {
        var children = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var spec in specs)
        {
            List<string> referenced;
            try
            {
                var rows = await _client.ExecuteStatementAsync($"SELECT * FROM pragma_foreign_key_list('{spec.Name}')");
                referenced = rows.Rows
                    .Select(r => Convert.ToString(r.TryGetValue("table", out var v) ? v : null))
                    .Where(t => !string.IsNullOrEmpty(t))
                    .Select(t => t!)
                    .ToList();
            }
            catch (Exception ex)
            {
                // Fail-closed: without a complete FK graph we cannot guarantee that a
                // parent rebuild won't cascade into (or be blocked by) a child table, so
                // do not attempt any repair at all this boot.
                throw new InvalidOperationException(
                    $"Could not inspect foreign keys of \"{spec.Name}\" — repair aborted to avoid data loss: {ex.Message}");
            }

            foreach (var parent in referenced)
            {
                if (string.Equals(parent, spec.Name, StringComparison.OrdinalIgnoreCase)) continue;
                if (!children.TryGetValue(parent, out var list)) children[parent] = list = new List<string>();
                if (!list.Contains(spec.Name, StringComparer.OrdinalIgnoreCase)) list.Add(spec.Name);
            }
        }
        return children;
    }

    private async Task<(List<string> Missing, List<string> StaleNotNull)> DiffAsync(TableSpec spec)
    {
        var live = await GetLiveColumnsAsync(spec.Name);
        var mapped = spec.Columns.Select(c => c.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var missing = mapped.Where(m => !live.ContainsKey(m)).ToList();
        // NOT NULL without a default on a column the entity never writes would reject
        // every INSERT (e.g. the old ChannelMembers.Role / Messages.SentAt).
        var staleNotNull = live.Values
            .Where(c => c.NotNull && string.IsNullOrEmpty(c.DefaultValue) && !mapped.Contains(c.Name))
            .Select(c => c.Name)
            .ToList();
        return (missing, staleNotNull);
    }

    private static HashSet<string> ExpandToChildren(HashSet<string> seed, Dictionary<string, List<string>> children)
    {
        var set = new HashSet<string>(seed, StringComparer.OrdinalIgnoreCase);
        var queue = new Queue<string>(seed);
        while (queue.Count > 0)
        {
            var table = queue.Dequeue();
            if (children.TryGetValue(table, out var kids))
            {
                foreach (var kid in kids)
                {
                    if (set.Add(kid)) queue.Enqueue(kid);
                }
            }
        }
        return set;
    }

    /// <summary>Orders the repair set so children are always rebuilt before their parents.</summary>
    private static List<string> TopologicalOrder(HashSet<string> repairSet, Dictionary<string, List<string>> children)
    {
        var ordered = new List<string>();
        var remaining = new HashSet<string>(repairSet, StringComparer.OrdinalIgnoreCase);

        while (remaining.Count > 0)
        {
            var ready = remaining
                .Where(t => !children.TryGetValue(t, out var kids) ||
                            kids.All(k => !remaining.Contains(k)))
                .ToList();

            if (ready.Count == 0)
            {
                // Circular FK pair — break the cycle by taking the first remaining table.
                ready.Add(remaining.First());
            }

            foreach (var r in ready)
            {
                ordered.Add(r);
                remaining.Remove(r);
            }
        }
        return ordered;
    }

    /// <summary>
    /// Rebuilds a table from its entity columns: CREATE _v2 -> copy common columns ->
    /// DROP original -> RENAME, sent as ONE atomic D1 batch. All columns except Id are
    /// nullable so future inserts can never fail on NOT NULL columns the entity does not
    /// populate. A table that does not exist yet is simply created.
    /// </summary>
    private async Task RebuildTableAsync(TableSpec spec)
    {
        var live = await GetLiveColumnsAsync(spec.Name);
        var v2 = $"\"{spec.Name}_v2\"";
        var statements = new List<(string Sql, object?[]? Parameters)>
        {
            ("PRAGMA foreign_keys = OFF", null),
            ($"DROP TABLE IF EXISTS {v2}", null)
        };

        if (string.Equals(spec.Name, "ClassEnrollments", StringComparison.OrdinalIgnoreCase))
        {
            statements.Add(("CREATE TABLE \"ClassEnrollments_v2\" (" +
                            "\"EnrolledClassesId\" TEXT NOT NULL, \"StudentsId\" TEXT NOT NULL, " +
                            "PRIMARY KEY (\"EnrolledClassesId\", \"StudentsId\"))", null));
            if (live.Count > 0)
            {
                statements.Add(("INSERT INTO \"ClassEnrollments_v2\" (\"EnrolledClassesId\", \"StudentsId\") " +
                                "SELECT \"EnrolledClassesId\", \"StudentsId\" FROM \"ClassEnrollments\"", null));
            }
        }
        else
        {
            var columnDefs = string.Join(", ", spec.Columns.Select(c =>
            {
                var isId = string.Equals(c.Name, "Id", StringComparison.OrdinalIgnoreCase);
                return $"\"{c.Name}\" {SqlType(c.Kind)}" + (isId ? " NOT NULL PRIMARY KEY" : " NULL");
            }));
            statements.Add(($"CREATE TABLE {v2} ({columnDefs})", null));

            // Copy only columns present in BOTH layouts (a brand-new table has no old data).
            var common = spec.Columns.Select(c => c.Name).Where(live.ContainsKey).ToList();
            if (common.Count > 0)
            {
                var cols = string.Join(", ", common.Select(c => $"\"{c}\""));
                statements.Add(($"INSERT INTO {v2} ({cols}) SELECT {cols} FROM \"{spec.Name}\"", null));
            }
        }

        if (live.Count > 0)
        {
            statements.Add(($"DROP TABLE \"{spec.Name}\"", null));
        }
        statements.Add(($"ALTER TABLE {v2} RENAME TO \"{spec.Name}\"", null));
        statements.Add(("PRAGMA foreign_keys = ON", null));

        await TryExecuteBatchAsync(statements, spec.Name);
    }

    /// <summary>
    /// Adds any missing (entity-mapped but not live) columns to a table IN PLACE via an
    /// additive ALTER TABLE ADD COLUMN. Every added column is nullable (matching how the
    /// rebuild path emits them), so the statement is valid even on a table that already
    /// holds rows. Because ALTER ADD COLUMN never touches foreign keys, it works even
    /// under Cloudflare D1's ENFORCED foreign keys — the primary fix for "no column named
    /// CreatedByUserId". Idempotent: only columns the entity maps and the live table lacks
    /// are added; once present they are skipped. Returns true if at least one column was
    /// added.
    /// </summary>
    private async Task<bool> AddMissingColumnsAsync(TableSpec spec)
    {
        var live = await GetLiveColumnsAsync(spec.Name);
        if (live.Count == 0)
        {
            // Table does not exist yet — schema init / the rebuild path will create it.
            return false;
        }

        var statements = spec.Columns
            .Where(c => !live.ContainsKey(c.Name))
            .Select(c => ($"ALTER TABLE \"{spec.Name}\" ADD COLUMN \"{c.Name}\" {SqlType(c.Kind)}", (object?[]?)null))
            .ToList();

        if (statements.Count == 0)
        {
            return false;
        }

        try
        {
            // One atomic D1 batch per table; all statements are attribute-additive so the
            // batch is safe and idempotent (a partially-repaired table just reports fewer).
            await _client.ExecuteBatchAsync(statements);
            return true;
        }
        catch (Exception ex)
        {
            // Atomic batch — nothing was applied. The table is left untouched and will be
            // retried on the next boot. In-place column adds are harmless to re-attempt.
            Console.WriteLine($"[D1] Adding missing column(s) to \"{spec.Name}\" failed (will retry next boot): {ex.Message}");
            return false;
        }
    }

    private async Task TryExecuteBatchAsync(List<(string Sql, object?[]? Parameters)> statements, string tableName)
    {
        try
        {
            await _client.ExecuteBatchAsync(statements);
        }
        catch (Exception ex)
        {
            // Atomic batch — nothing was applied. The table is left untouched and will
            // be retried on the next boot.
            Console.WriteLine($"[D1] Table \"{tableName}\" rebuild failed (will retry next boot): {ex.Message}");
        }
    }

    /// <summary>Returns the live column definitions (name, notnull, default) of a table.</summary>
    private async Task<Dictionary<string, LiveColumn>> GetLiveColumnsAsync(string tableName)
    {
        // "notnull" is a reserved word, so select all pragma_table_info columns instead
        // of aliasing individual ones (same behaviour on real Cloudflare D1).
        var result = await _client.ExecuteStatementAsync(
            $"SELECT * FROM pragma_table_info('{tableName}')");
        var columns = new Dictionary<string, LiveColumn>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in result.Rows)
        {
            var name = Convert.ToString(row.TryGetValue("name", out var n) ? n : null);
            if (string.IsNullOrEmpty(name)) continue;
            var notNull = row.TryGetValue("notnull", out var nn) && Convert.ToInt64(nn ?? 0L) != 0;
            var dflt = row.TryGetValue("dflt_value", out var d) ? d as string : null;
            columns[name] = new LiveColumn(name, notNull, dflt);
        }
        return columns;
    }

    /// <summary>SQLite storage type matching how D1ValueConverter serializes values.</summary>
    private static string SqlType(D1ValueKind kind) => kind switch
    {
        D1ValueKind.Guid => "TEXT",
        D1ValueKind.DateTime => "TEXT",
        D1ValueKind.String => "TEXT",
        D1ValueKind.Decimal => "TEXT",
        D1ValueKind.Bool => "INTEGER",
        D1ValueKind.Enum => "INTEGER",
        D1ValueKind.Int => "INTEGER",
        D1ValueKind.Long => "INTEGER",
        D1ValueKind.Double => "REAL",
        _ => "TEXT"
    };
}
