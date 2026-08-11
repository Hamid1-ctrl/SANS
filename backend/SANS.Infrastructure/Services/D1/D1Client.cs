using System.Globalization;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SANS.Infrastructure.Services.D1;

/// <summary>
/// Minimal client for the Cloudflare D1 REST API:
///   POST /client/v4/accounts/{accountId}/d1/database/{databaseId}/query
/// Executes raw SQLite SQL with positional (?) parameters, either single statements
/// or atomic batches.
/// </summary>
public class D1Client : ID1Client
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly D1Options _options;

    public D1Client(HttpClient httpClient, D1Options options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<D1QueryResult> ExecuteStatementAsync(string sql, object?[]? parameters = null)
    {
        var results = await ExecuteBatchAsync(new[] { (sql, parameters) });
        return results[0];
    }

    public async Task<IReadOnlyList<D1QueryResult>> ExecuteBatchAsync(
        IEnumerable<(string Sql, object?[]? Parameters)> statements)
    {
        if (_options == null || !_options.IsConfigured)
        {
            throw new InvalidOperationException(
                "Cloudflare D1 is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_API_TOKEN.");
        }

        var list = statements.ToList();
        if (list.Count == 0)
        {
            return Array.Empty<D1QueryResult>();
        }

        var endpoint = $"{_options.BaseUrl.TrimEnd('/')}/accounts/{_options.AccountId}/d1/database/{_options.DatabaseId}/query";
        var output = new List<D1QueryResult>();

        foreach (var statement in list)
        {
            var payload = BuildStatementPayload(statement.Sql, statement.Parameters);

            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiToken);
            request.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

            using var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"D1 request failed with HTTP {(int)response.StatusCode}: {Truncate(body)}");
            }

            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;

            if (!root.TryGetProperty("success", out var successElement) || !successElement.GetBoolean())
            {
                var errors = string.Join("; ", root.TryGetProperty("errors", out var errs)
                    ? errs.EnumerateArray().Select(e => e.TryGetProperty("message", out var m) ? m.GetString() : e.ToString())
                    : Enumerable.Empty<string?>());
                throw new InvalidOperationException($"D1 request failed: {errors}");
            }

            var result = root.TryGetProperty("result", out var resultElement) && resultElement.ValueKind == JsonValueKind.Array
                ? resultElement
                : default;

            if (result.ValueKind == JsonValueKind.Array)
            {
                foreach (var entry in result.EnumerateArray())
                {
                    output.Add(ParseResultEntry(entry));
                }
            }
            else
            {
                output.Add(new D1QueryResult());
            }
        }

        return output;
    }

    private static object BuildStatementPayload(string sql, object?[]? parameters)
    {
        return new
        {
            sql,
            @params = NormalizeParameters(parameters)
        };
    }

    private static object?[] NormalizeParameters(object?[]? parameters)
    {
        if (parameters == null || parameters.Length == 0)
        {
            return Array.Empty<object?>();
        }

        var normalized = new object?[parameters.Length];
        for (var i = 0; i < parameters.Length; i++)
        {
            normalized[i] = D1ValueConverter.ToTransportValue(parameters[i]);
        }
        return normalized;
    }

    private static D1QueryResult ParseResultEntry(JsonElement entry)
    {
        var rows = new List<Dictionary<string, object?>>();
        long changes = 0;
        long lastRowId = 0;

        if (entry.TryGetProperty("results", out var resultsElement) && resultsElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var row in resultsElement.EnumerateArray())
            {
                var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                foreach (var prop in row.EnumerateObject())
                {
                    dict[prop.Name] = D1ValueConverter.FromJsonElement(prop.Value);
                }
                rows.Add(dict);
            }
        }

        if (entry.TryGetProperty("meta", out var metaElement) && metaElement.ValueKind == JsonValueKind.Object)
        {
            if (metaElement.TryGetProperty("changes", out var changesElement) && changesElement.ValueKind == JsonValueKind.Number)
            {
                changes = changesElement.TryGetInt64(out var c) ? c : 0;
            }
            if (metaElement.TryGetProperty("last_row_id", out var lastRowElement) && lastRowElement.ValueKind == JsonValueKind.Number)
            {
                lastRowId = lastRowElement.TryGetInt64(out var l) ? l : 0;
            }
        }

        return new D1QueryResult { Rows = rows, Changes = changes, LastRowId = lastRowId };
    }

    private static string Truncate(string value, int max = 500)
    {
        return value.Length <= max ? value : value.Substring(0, max) + "...";
    }
}

/// <summary>
/// Converts between .NET values and the JSON transport representation used by D1,
/// matching the storage conventions previously used by EF Core + SQLite:
///  - Guid        -> lowercase "D" string
///  - DateTime    -> "yyyy-MM-dd HH:mm:ss.fffffff" (SQLite TEXT)
///  - bool        -> 0/1
///  - enum        -> integer
///  - decimal     -> invariant string (SQLite TEXT)
/// </summary>
public static class D1ValueConverter
{
    public const string DateTimeFormat = "yyyy-MM-dd HH:mm:ss.fffffff";

    public static object? ToTransportValue(object? value)
    {
        if (value == null) return null;

        var type = value.GetType();
        type = Nullable.GetUnderlyingType(type) ?? type;

        if (value is Guid guid) return guid.ToString("D");
        if (type.IsEnum) return Convert.ToInt32(value);
        if (value is bool b) return b ? 1 : 0;
        if (value is DateTime dt) return dt.ToString(DateTimeFormat, CultureInfo.InvariantCulture);
        if (value is decimal m) return m.ToString(CultureInfo.InvariantCulture);
        if (value is string || value is int || value is long || value is short || value is double || value is float)
        {
            return value;
        }
        return value.ToString();
    }

    public static object? FromJsonElement(JsonElement element)
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
                return true;
            case JsonValueKind.False:
                return false;
            case JsonValueKind.Array:
                return element.EnumerateArray().Select(FromJsonElement).ToList();
            default:
                return element.ToString();
        }
    }

    public static DateTime ParseDateTime(object? value)
    {
        if (value is DateTime dt) return dt;
        if (value is long l) return DateTime.FromBinary(l);
        if (value is string s)
        {
            if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed))
            {
                return parsed;
            }
        }
        return default;
    }

    public static Guid ParseGuid(object? value)
    {
        if (value is Guid g) return g;
        if (value is string s && Guid.TryParse(s, out var guid)) return guid;
        return Guid.Empty;
    }

    public static bool ParseBool(object? value)
    {
        return value switch
        {
            null => false,
            bool b => b,
            long l => l != 0,
            int i => i != 0,
            double d => d != 0,
            string s => s == "1" || s.Equals("true", StringComparison.OrdinalIgnoreCase),
            _ => false
        };
    }

    public static decimal ParseDecimal(object? value)
    {
        return value switch
        {
            null => 0m,
            decimal d => d,
            double db => (decimal)db,
            long l => l,
            string s when decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) => parsed,
            string s when decimal.TryParse(s, NumberStyles.Any, CultureInfo.CurrentCulture, out var parsed2) => parsed2,
            _ => 0m
        };
    }
}
