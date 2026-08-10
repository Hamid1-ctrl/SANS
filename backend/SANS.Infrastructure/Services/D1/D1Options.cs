namespace SANS.Infrastructure.Services.D1;

/// <summary>
/// Configuration required to talk to a Cloudflare D1 database over its REST API.
/// Values are read from configuration/environment variables:
/// CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN
/// (plus an optional D1_API_BASE_URL override, used for local testing against a mock).
/// </summary>
public class D1Options
{
    public const string SectionName = "CloudflareD1";

    public string AccountId { get; set; } = string.Empty;
    public string DatabaseId { get; set; } = string.Empty;
    public string ApiToken { get; set; } = string.Empty;

    /// <summary>Base URL of the Cloudflare v4 API. Overridable for local testing.</summary>
    public string BaseUrl { get; set; } = "https://api.cloudflare.com/client/v4";

    /// <summary>True when all required values are present so the app can reach D1.</summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AccountId) &&
        !string.IsNullOrWhiteSpace(DatabaseId) &&
        !string.IsNullOrWhiteSpace(ApiToken);
}
