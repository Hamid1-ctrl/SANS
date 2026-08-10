namespace SANS.Infrastructure.Services.D1;

/// <summary>Result of executing one SQL statement against D1.</summary>
public class D1QueryResult
{
    /// <summary>Selected rows for SELECT statements; empty for writes.</summary>
    public IReadOnlyList<Dictionary<string, object?>> Rows { get; init; } = Array.Empty<Dictionary<string, object?>>();

    /// <summary>Number of rows written/changed for INSERT/UPDATE/DELETE.</summary>
    public long Changes { get; init; }

    /// <summary>Last auto-increment row id (not used — the app uses GUID primary keys).</summary>
    public long LastRowId { get; init; }
}

public interface ID1Client
{
    /// <summary>
    /// Executes a single SQL statement (with positional ? parameters) against the D1 database.
    /// </summary>
    Task<D1QueryResult> ExecuteStatementAsync(string sql, object?[]? parameters = null);

    /// <summary>
    /// Executes multiple SQL statements atomically (single transaction).
    /// </summary>
    Task<IReadOnlyList<D1QueryResult>> ExecuteBatchAsync(IEnumerable<(string Sql, object?[]? Parameters)> statements);
}
