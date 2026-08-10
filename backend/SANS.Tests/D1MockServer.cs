using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SANS.Tests;

/// <summary>
/// In-process mock of the Cloudflare D1 REST API:
///   POST /client/v4/accounts/{accountId}/d1/database/{databaseId}/query
/// Backed by an in-memory SQLite database initialised with the real
/// cloudflare_d1_schema.sql migration log. The mock applies the schema, executes
/// the submitted SQL with parameter binding, wraps each request's statements in a
/// single transaction (mirroring D1 batch semantics) and returns the same JSON
/// envelope the real API returns, so the app's real <see cref="D1Client"/> can be
/// exercised end-to-end.
/// </summary>
public sealed class D1MockServer : IDisposable
{
    private readonly WebApplication _app;
    private readonly SqliteConnection _db;
    private bool _disposed;

    public string BaseUrl { get; }

    public D1MockServer(string schemaFileName = "cloudflare_d1_schema.sql", bool applySeed = true)
    {
        _db = new SqliteConnection("Data Source=:memory:");
        _db.Open();

        var schemaPath = Path.Combine(AppContext.BaseDirectory, schemaFileName);
        if (!File.Exists(schemaPath))
        {
            throw new InvalidOperationException($"Schema file not found at {schemaPath}");
        }

        var schema = File.ReadAllText(schemaPath);
        foreach (var rawStatement in schema.Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            var sql = rawStatement.Trim();
            if (sql.Length == 0) continue;

            // Skip EF debug leftovers like "SELECT changes();"
            if (sql.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase)) continue;

            using var cmd = _db.CreateCommand();
            cmd.CommandText = sql;
            cmd.ExecuteNonQuery();
        }

        // Apply the real seed data (mirrors production): creates the seeded admin
        // (admin.sans@sans.edu, Role=Administrator), demo users, classes, etc.
        if (applySeed)
        {
            var seedPath = Path.Combine(AppContext.BaseDirectory, "d1_seed_data.sql");
            if (File.Exists(seedPath))
            {
                var seed = File.ReadAllText(seedPath);
                foreach (var rawStatement in seed.Split(';', StringSplitOptions.RemoveEmptyEntries))
                {
                    var sql = rawStatement.Trim();
                    if (sql.Length == 0) continue;
                    if (sql.StartsWith("--")) continue;
                    if (sql.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase)) continue;

                    using var cmd = _db.CreateCommand();
                    cmd.CommandText = sql;
                    cmd.ExecuteNonQuery();
                }
            }
        }

        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");

        _app = builder.Build();
        _app.MapPost("/client/v4/accounts/{accountId}/d1/database/{databaseId}/query", HandleQueryAsync);
        _app.Start();

        var server = _app.Services.GetRequiredService<IServer>();
        var addressFeature = server.Features.Get<IServerAddressesFeature>();
        BaseUrl = addressFeature?.Addresses.FirstOrDefault()
            ?? throw new InvalidOperationException("Could not determine mock server address.");
    }

    private async Task HandleQueryAsync(HttpContext context, string accountId, string databaseId)
    {
        try
        {
            await HandleQueryCoreAsync(context);
        }
        catch (Exception ex)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                result = Array.Empty<object>(),
                errors = new[] { new { message = ex.Message, code = 1001 } }
            });
        }
    }

    private async Task HandleQueryCoreAsync(HttpContext context)
    {
        string body;
        using (var reader = new StreamReader(context.Request.Body))
        {
            body = await reader.ReadToEndAsync();
        }

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var statements = root.ValueKind == JsonValueKind.Array
            ? root.EnumerateArray().ToList()
            : new List<JsonElement> { root };

        var results = new List<object>();

        using (var transaction = _db.BeginTransaction())
        {
            foreach (var statement in statements)
            {
                var sql = statement.GetProperty("sql").GetString() ?? string.Empty;

                var parameterValues = new List<object?>();
                if (statement.TryGetProperty("params", out var paramsElement) &&
                    paramsElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var p in paramsElement.EnumerateArray())
                    {
                        parameterValues.Add(ConvertParam(p));
                    }
                }

                using var cmd = _db.CreateCommand();
                cmd.Transaction = transaction;
                cmd.CommandText = RewritePositionalParameters(sql, parameterValues.Count);
                for (var i = 0; i < parameterValues.Count; i++)
                {
                    cmd.Parameters.AddWithValue($"@p{i + 1}", parameterValues[i] ?? DBNull.Value);
                }

                var rows = new List<Dictionary<string, object?>>();
                long changes = 0;

                var isSelect = sql.TrimStart().StartsWith("SELECT", StringComparison.OrdinalIgnoreCase);
                if (isSelect)
                {
                    using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                        for (var i = 0; i < reader.FieldCount; i++)
                        {
                            row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                        }
                        rows.Add(row);
                    }
                }
                else
                {
                    changes = await cmd.ExecuteNonQueryAsync();
                }

                results.Add(new
                {
                    results = rows,
                    success = true,
                    meta = new { changed_db = true, changes, last_row_id = 0L, duration = 0 }
                });
            }

            transaction.Commit();
        }

        await context.Response.WriteAsJsonAsync(new
        {
            success = true,
            result = results,
            errors = Array.Empty<object>()
        });
    }

    /// <summary>Converts a JSON parameter value from the D1 transport to a SQLite value.</summary>
    private static object? ConvertParam(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                return null;
            case JsonValueKind.String:
                return element.GetString();
            case JsonValueKind.Number:
                if (element.TryGetInt64(out var l)) return l;
                if (element.TryGetDouble(out var d)) return d;
                return element.GetRawText();
            case JsonValueKind.True:
                return 1L;
            case JsonValueKind.False:
                return 0L;
            default:
                return element.ToString();
        }
    }

    /// <summary>
    /// Rewrites positional "?" placeholders to named @pN parameters (Microsoft.Data.Sqlite
    /// does not bind unnamed "?" parameters reliably). The app only uses "?" as a
    /// placeholder token, never inside string literals.
    /// </summary>
    private static string RewritePositionalParameters(string sql, int parameterCount)
    {
        if (parameterCount == 0) return sql;

        var sb = new StringBuilder(sql.Length + parameterCount * 3);
        var index = 0;
        foreach (var ch in sql)
        {
            if (ch == '?')
            {
                index++;
                sb.Append("@p").Append(index);
            }
            else
            {
                sb.Append(ch);
            }
        }
        return sb.ToString();
    }

    /// <summary>Runs a raw SQL statement directly against the mock database (used to apply migrations).</summary>
    public void ExecuteRawSql(string sql)
    {
        using var cmd = _db.CreateCommand();
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
    }

    /// <summary>Describes one column of a table via PRAGMA table_info.</summary>
    public sealed record TableColumnInfo(string Name, bool NotNull, string? DefaultValue);

    /// <summary>Returns the live column definitions of a table in the mock database.</summary>
    public List<TableColumnInfo> GetTableColumns(string tableName)
    {
        var columns = new List<TableColumnInfo>();
        using var cmd = _db.CreateCommand();
        cmd.CommandText = $"PRAGMA table_info(\"{tableName}\")";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            columns.Add(new TableColumnInfo(
                reader.GetString(1),
                reader.GetInt32(3) == 1,
                reader.IsDBNull(4) ? null : reader.GetString(4)));
        }
        return columns;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _app.StopAsync().GetAwaiter().GetResult();
        _app.DisposeAsync().GetAwaiter().GetResult();
        _db.Dispose();
    }
}
