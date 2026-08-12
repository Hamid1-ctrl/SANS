using System.Collections.Concurrent;
using System.Globalization;
using System.Reflection;

namespace SANS.Infrastructure.Services.D1;

internal enum D1ValueKind
{
    Guid,
    DateTime,
    Bool,
    Enum,
    Decimal,
    Long,
    Int,
    Double,
    String
}

internal sealed class D1Column
{
    public required PropertyInfo Property { get; init; }
    public required string ColumnName { get; init; }
    public required D1ValueKind Kind { get; init; }
}

/// <summary>
/// Generic CRUD helper over a single D1 table. Entity property names map to column
/// names (EF Core convention). Navigation / collection properties are excluded
/// automatically. Writes are queued on the owning <see cref="D1Context"/> and flushed
/// atomically by <see cref="D1Context.SaveChangesAsync"/>.
/// </summary>
public class D1Table<T> where T : class, new()
{
    private static readonly ConcurrentDictionary<Type, D1Column[]> ColumnCache = new();

    private readonly ID1Client _client;
    private readonly D1Context _context;
    private readonly D1Column[] _columns;

    public string TableName { get; }

    /// <summary>Column names this table's entity maps (for schema verification).</summary>
    internal string[] GetMappedColumnNames() => _columns.Select(c => c.ColumnName).ToArray();

    /// <summary>Mapped columns with their storage kinds (for schema verification/repair).</summary>
    internal D1Column[] Columns => _columns;

    internal D1Table(ID1Client client, D1Context context)
    {
        _client = client;
        _context = context;
        TableName = GetTableName(typeof(T));
        _columns = GetColumns(typeof(T));
    }

    /// <summary>
    /// Maps an entity type to its EF Core table name. The D1 schema was generated
    /// from EF Core migrations, which uses a full inflector with irregular plurals
    /// (Quiz -&gt; Quizzes), so an explicit map for every known entity is safer than a
    /// heuristic. Unknown entities fall back to the standard pluralisation rules.
    /// </summary>
    private static readonly Dictionary<string, string> KnownTableNames = new(StringComparer.Ordinal)
    {
        ["User"] = "Users",
        ["Department"] = "Departments",
        ["RefreshToken"] = "RefreshTokens",
        ["Announcement"] = "Announcements",
        ["Notification"] = "Notifications",
        ["Assignment"] = "Assignments",
        ["AssignmentSubmission"] = "AssignmentSubmissions",
        ["LearningResource"] = "LearningResources",
        ["Message"] = "Messages",
        ["Channel"] = "Channels",
        ["ChannelMember"] = "ChannelMembers",
        ["Schedule"] = "Schedules",
        ["Exam"] = "Exams",
        ["AuditLog"] = "AuditLogs",
        ["ClassWorkspace"] = "ClassWorkspaces",
        ["Bookmark"] = "Bookmarks",
        ["AnnouncementEngagement"] = "AnnouncementEngagements",
        ["Quiz"] = "Quizzes",
        ["DiscussionThread"] = "DiscussionThreads",
        ["DiscussionReply"] = "DiscussionReplies",
        ["DiscussionAttachment"] = "DiscussionAttachments",
        ["RepProposal"] = "RepProposals",
        ["SemesterTimeline"] = "SemesterTimelines"
    };

    private static string GetTableName(Type type)
    {
        if (KnownTableNames.TryGetValue(type.Name, out var mapped))
        {
            return mapped;
        }

        var name = type.Name;
        if (name.Length == 0) return name;

        // consonant + y -> ies (DiscussionReply -> DiscussionReplies)
        if (name.EndsWith("y", StringComparison.Ordinal) && name.Length > 1 && !IsVowel(name[name.Length - 2]))
        {
            return name.Substring(0, name.Length - 1) + "ies";
        }

        // s, x, ch, sh -> es
        if (name.EndsWith("s", StringComparison.Ordinal) ||
            name.EndsWith("x", StringComparison.Ordinal) ||
            name.EndsWith("ch", StringComparison.Ordinal) ||
            name.EndsWith("sh", StringComparison.Ordinal))
        {
            return name + "es";
        }

        return name + "s";
    }

    private static bool IsVowel(char c)
    {
        return c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u' ||
               c == 'A' || c == 'E' || c == 'I' || c == 'O' || c == 'U';
    }

    private static D1Column[] GetColumns(Type type)
    {
        return ColumnCache.GetOrAdd(type, static t =>
        {
            var props = t.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.CanRead && p.CanWrite)
                .Where(p => IsMappedProperty(p.PropertyType))
                .Select(p => new D1Column
                {
                    Property = p,
                    ColumnName = p.Name,
                    Kind = GetKind(p.PropertyType)
                })
                .ToArray();
            return props;
        });
    }

    private static bool IsMappedProperty(Type type)
    {
        var underlying = Nullable.GetUnderlyingType(type) ?? type;
        if (type == typeof(string)) return true;
        if (underlying == typeof(Guid)) return true;
        if (underlying == typeof(DateTime)) return true;
        if (underlying.IsEnum) return true;
        if (underlying == typeof(bool)) return true;
        if (underlying == typeof(short) || underlying == typeof(int) || underlying == typeof(long)) return true;
        if (underlying == typeof(float) || underlying == typeof(double) || underlying == typeof(decimal)) return true;
        return false;
    }

    private static D1ValueKind GetKind(Type type)
    {
        var underlying = Nullable.GetUnderlyingType(type) ?? type;
        if (underlying == typeof(Guid)) return D1ValueKind.Guid;
        if (underlying == typeof(DateTime)) return D1ValueKind.DateTime;
        if (underlying.IsEnum) return D1ValueKind.Enum;
        if (underlying == typeof(bool)) return D1ValueKind.Bool;
        if (underlying == typeof(decimal)) return D1ValueKind.Decimal;
        if (underlying == typeof(long)) return D1ValueKind.Long;
        if (underlying == typeof(short) || underlying == typeof(int)) return D1ValueKind.Int;
        if (underlying == typeof(float) || underlying == typeof(double)) return D1ValueKind.Double;
        return D1ValueKind.String;
    }

    private static bool IsNullable(Type type) => !type.IsValueType || Nullable.GetUnderlyingType(type) != null;

    // ─── Queries ───────────────────────────────────────────────────────────────

    /// <summary>
    /// SELECT * FROM "Table" {whereClause} {orderBy}
    /// whereClause should start with WHERE (or be empty), orderBy should start with ORDER BY (or be null).
    /// </summary>
    public async Task<List<T>> QueryAsync(string whereClause = "", string? orderBy = null, object?[]? parameters = null)
    {
        var sql = BuildSelect(whereClause, orderBy);
        var result = await _client.ExecuteStatementAsync(sql, parameters);
        return MapRows(result.Rows);
    }

    /// <summary>Convenience overload for the common case: WHERE clause + parameters, no ORDER BY.</summary>
    public Task<List<T>> QueryAsync(string whereClause, object?[] parameters)
    {
        return QueryAsync(whereClause, null, parameters);
    }

    public async Task<T?> QueryFirstOrDefaultAsync(string whereClause, object?[]? parameters = null)
    {
        var sql = BuildSelect(whereClause, null) + " LIMIT 1";
        var result = await _client.ExecuteStatementAsync(sql, parameters);
        return result.Rows.Count > 0 ? MapRow(result.Rows[0]) : null;
    }

    public async Task<T?> FindAsync(Guid id)
    {
        return await QueryFirstOrDefaultAsync("WHERE lower(\"Id\") = lower(?)", new object?[] { id });
    }

    public async Task<List<T>> GetAllAsync()
    {
        return await QueryAsync();
    }

    public async Task<int> CountAsync(string whereClause = "", object?[]? parameters = null)
    {
        var result = await _client.ExecuteStatementAsync(
            $"SELECT COUNT(*) AS \"Count\" FROM \"{TableName}\" {NormalizeWhere(whereClause)}", parameters);
        if (result.Rows.Count > 0 && result.Rows[0].TryGetValue("Count", out var raw))
        {
            return Convert.ToInt32(raw ?? 0L, CultureInfo.InvariantCulture);
        }
        return 0;
    }

    public async Task<bool> AnyAsync(string whereClause, object?[]? parameters = null)
    {
        return await CountAsync(whereClause, parameters) > 0;
    }

    public async Task<long> ScalarLongAsync(string sql, object?[]? parameters = null)
    {
        var result = await _client.ExecuteStatementAsync(sql, parameters);
        if (result.Rows.Count > 0 && result.Rows[0].Count > 0)
        {
            var raw = result.Rows[0].Values.FirstOrDefault();
            return Convert.ToInt64(raw ?? 0L, CultureInfo.InvariantCulture);
        }
        return 0;
    }

    /// <summary>Immediate execution (e.g. ClassEnrollments writes); returns rows changed.</summary>
    public async Task<int> ExecuteAsync(string sql, object?[]? parameters = null)
    {
        var result = await _client.ExecuteStatementAsync(sql, parameters);
        return (int)result.Changes;
    }

    private string BuildSelect(string whereClause, string? orderBy)
    {
        var where = NormalizeWhere(whereClause);
        if (where.Length > 0) where = " " + where;
        var order = string.IsNullOrWhiteSpace(orderBy) ? "" : " " + orderBy.Trim();
        return $"SELECT * FROM \"{TableName}\"{where}{order}";
    }

    /// <summary>
    /// Ensures a WHERE clause starts with the WHERE keyword (prepending it when
    /// missing) so a bare predicate can never generate invalid SQL.
    /// </summary>
    private static string NormalizeWhere(string whereClause)
    {
        var trimmed = whereClause.Trim();
        if (trimmed.Length == 0) return string.Empty;
        if (trimmed.StartsWith("WHERE", StringComparison.OrdinalIgnoreCase)) return trimmed;
        return "WHERE " + trimmed;
    }

    // ─── Queued writes (flushed by D1Context.SaveChangesAsync) ─────────────────

    public void Add(T entity)
    {
        var (sql, parameters) = BuildInsert(entity);
        _context.Enqueue(sql, parameters);
    }
    public Task AddAsync(T entity) { Add(entity); return Task.CompletedTask; }

    public void Update(T entity)
    {
        var (sql, parameters) = BuildUpdate(entity);
        _context.Enqueue(sql, parameters);
    }
    public Task UpdateAsync(T entity) { Update(entity); return Task.CompletedTask; }

    public void Remove(T entity)
    {
        var (sql, parameters) = BuildDelete(entity);
        _context.Enqueue(sql, parameters);
    }
    public Task RemoveAsync(T entity) { Remove(entity); return Task.CompletedTask; }

    public void Delete(T entity) => Remove(entity);
    public Task DeleteAsync(T entity) => RemoveAsync(entity);

    private (string Sql, object?[] Parameters) BuildInsert(T entity)
    {
        var names = string.Join(", ", _columns.Select(c => $"\"{c.ColumnName}\""));
        var placeholders = string.Join(", ", _columns.Select(_ => "?"));
        var parameters = _columns.Select(c => D1ValueConverter.ToTransportValue(c.Property.GetValue(entity))).ToArray();
        return ($"INSERT INTO \"{TableName}\" ({names}) VALUES ({placeholders})", parameters);
    }

    private (string Sql, object?[] Parameters) BuildUpdate(T entity)
    {
        var idColumn = _columns.FirstOrDefault(c => c.ColumnName == "Id") ?? throw new InvalidOperationException($"Table {TableName} has no Id column.");
        var sets = string.Join(", ", _columns.Where(c => c.ColumnName != "Id").Select(c => $"\"{c.ColumnName}\" = ?"));
        var parameters = _columns.Where(c => c.ColumnName != "Id")
            .Select(c => D1ValueConverter.ToTransportValue(c.Property.GetValue(entity)))
            .Append(D1ValueConverter.ToTransportValue(idColumn.Property.GetValue(entity)))
            .ToArray();
        return ($"UPDATE \"{TableName}\" SET {sets} WHERE \"Id\" = ?", parameters);
    }

    private (string Sql, object?[] Parameters) BuildDelete(T entity)
    {
        var idValue = _columns.FirstOrDefault(c => c.ColumnName == "Id")?.Property.GetValue(entity);
        return ($"DELETE FROM \"{TableName}\" WHERE \"Id\" = ?", new[] { D1ValueConverter.ToTransportValue(idValue) });
    }

    // ─── Row mapping ───────────────────────────────────────────────────────────

    internal List<T> MapRows(IReadOnlyList<Dictionary<string, object?>> rows)
    {
        var list = new List<T>(rows.Count);
        foreach (var row in rows)
        {
            list.Add(MapRow(row));
        }
        return list;
    }

    private T MapRow(Dictionary<string, object?> row)
    {
        var entity = new T();
        foreach (var column in _columns)
        {
            if (!row.TryGetValue(column.ColumnName, out var raw))
            {
                continue;
            }

            var property = column.Property;
            if (raw == null)
            {
                if (IsNullable(property.PropertyType))
                {
                    property.SetValue(entity, null);
                }
                continue;
            }

            property.SetValue(entity, ConvertValue(raw, column.Kind, property.PropertyType));
        }
        return entity;
    }

    private static object? ConvertValue(object? raw, D1ValueKind kind, Type propertyType)
    {
        var underlying = Nullable.GetUnderlyingType(propertyType) ?? propertyType;

        switch (kind)
        {
            case D1ValueKind.Guid:
                return D1ValueConverter.ParseGuid(raw);
            case D1ValueKind.DateTime:
                return D1ValueConverter.ParseDateTime(raw);
            case D1ValueKind.Bool:
                return D1ValueConverter.ParseBool(raw);
            case D1ValueKind.Enum:
                var intValue = Convert.ToInt32(raw, CultureInfo.InvariantCulture);
                return Enum.ToObject(underlying, intValue);
            case D1ValueKind.Decimal:
                return D1ValueConverter.ParseDecimal(raw);
            case D1ValueKind.Long:
                return Convert.ToInt64(raw, CultureInfo.InvariantCulture);
            case D1ValueKind.Int:
                return Convert.ToInt32(raw, CultureInfo.InvariantCulture);
            case D1ValueKind.Double:
                return Convert.ToDouble(raw, CultureInfo.InvariantCulture);
            default:
                return raw?.ToString();
        }
    }
}
