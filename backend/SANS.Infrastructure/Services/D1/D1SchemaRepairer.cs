namespace SANS.Infrastructure.Services.D1;

/// <summary>
/// Startup-time schema self-healing. Verifies that every table the app writes has
/// exactly the columns its entity maps (D1Table writes ALL mapped columns), and
/// rebuilds any table that is out of date:
///   - missing columns the entity writes (e.g. an old ClassWorkspaces table with no
///     CourseCode / CreatedByUserId), or
///   - NOT NULL columns the entity never writes (e.g. ClassWorkspaces.LecturerId was
///     NOT NULL, which rejected every rep-created class).
///
/// Cloudflare D1 ENFORCES foreign keys and ignores PRAGMA foreign_keys = OFF inside
/// its implicit transactions, so DROPping a parent table would cascade-delete (or be
/// blocked by) rows in child tables that still carry FK constraints. The repairer
/// therefore rebuilds the transitive closure of all FK-affected tables, children
/// BEFORE parents, so every child's FK constraints are stripped before its parent is
/// dropped. Rebuilding is idempotent: once a table matches the entity it is skipped,
/// and data in columns shared between the old and new layout is preserved.
///
/// Notes / accepted trade-offs:
///  - Rebuilding strips FK constraints from every rebuilt table, and the closure also
///    rebuilds healthy FK children of a repaired table. After a repair the affected
///    tables are FK-free — safe for this app, which soft-deletes and never relies on
///    database cascades.
///  - A table whose columns are ALL present but which has a stale NOT NULL on a
///    nullable entity column (e.g. the old ClassWorkspaces.LecturerId) is only rebuilt
///    when it is also missing a column or is an FK child of a rebuilt table — which is
///    exactly the case for every old-schema database this repairer exists for.
///  - If foreign-key introspection fails for any table, the repair ABORTS (fail-closed)
///    rather than risk dropping a parent whose children still carry constraints.
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
    /// Repairs every out-of-date table. Returns the number of tables that were rebuilt.
    /// Never throws: failures are logged and skipped so a bad table cannot block startup
    /// or the repair of the others.
    /// </summary>
    public async Task<int> RepairIfNeededAsync(D1Context context)
    {
        var specs = BuildSpecs(context);
        var specsByName = specs.ToDictionary(s => s.Name, StringComparer.OrdinalIgnoreCase);
        var repaired = new List<string>();

        try
        {
            // 1. FK graph: parent table -> tables that reference it (children).
            var children = await BuildForeignKeyGraphAsync(specs);

            // 2. Find tables whose live schema no longer matches their entity.
            var needsRepair = new List<TableSpec>();
            foreach (var spec in specs)
            {
                var (missing, staleNotNull) = await DiffAsync(spec);
                if (missing.Count > 0 || staleNotNull.Count > 0)
                {
                    needsRepair.Add(spec);
                }
            }

            if (needsRepair.Count == 0)
            {
                return 0;
            }

            // 3. Rebuilding a parent DROPs it, which (with D1's enforced foreign keys)
            //    would cascade into child tables still carrying FK constraints. Rebuilding
            //    a child strips its FKs, so the closure of ALL affected children must be
            //    rebuilt too — and children must be rebuilt BEFORE their parents.
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
