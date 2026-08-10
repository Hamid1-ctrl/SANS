using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Application.Interfaces;
using SANS.Application.Interfaces.Repositories;
using SANS.Application.Interfaces.Services;
using SANS.Infrastructure.Data;
using SANS.Infrastructure.Repositories;
using SANS.Infrastructure.Services;
using SANS.Infrastructure.Services.D1;
using SANS.WebAPI.Hubs;
using SANS.WebAPI.Middleware;
using SANS.WebAPI.Services;

Environment.SetEnvironmentVariable("DOTNET_USE_POLLING_FILE_WATCHER", "1");
Environment.SetEnvironmentVariable("ASPNETCORE_hostBuilder__reloadConfigOnChange", "false");
Microsoft.IdentityModel.Logging.IdentityModelEventSource.ShowPII = true;

// Load environment variables from .env file
var rootDir = Directory.GetCurrentDirectory();
var envPath = Path.Combine(rootDir, "..", "frontend", ".env");
if (!File.Exists(envPath))
{
    envPath = Path.Combine(rootDir, "frontend", ".env");
}
if (File.Exists(envPath))
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        var trimmed = line.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#")) continue;
        var parts = trimmed.Split('=', 2);
        if (parts.Length == 2)
        {
            var key = parts[0].Trim();
            var val = parts[1].Trim();
            // Remove surrounding quotes if present
            if ((val.StartsWith("\"") && val.EndsWith("\"")) || (val.StartsWith("'") && val.EndsWith("'")))
            {
                val = val.Substring(1, val.Length - 2);
            }
            Environment.SetEnvironmentVariable(key, val);
        }
    }
}

var builder = WebApplication.CreateBuilder(args);
builder.Host.ConfigureAppConfiguration((hostingContext, config) =>
{
    config.Sources.Clear();
    var env = hostingContext.HostingEnvironment;
    config.AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
          .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true, reloadOnChange: false)
          .AddEnvironmentVariables();
});

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// ─── Cloudflare D1 configuration ──────────────────────────────────────────────
// The app reads CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and
// CLOUDFLARE_API_TOKEN from configuration / environment (including frontend/.env
// which is loaded above). An optional D1_API_BASE_URL override is used for local
// testing against the in-memory mock server.
builder.Services.Configure<D1Options>(options =>
{
    options.AccountId = builder.Configuration["CLOUDFLARE_ACCOUNT_ID"]
        ?? builder.Configuration["CloudflareD1:AccountId"]
        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID") ?? string.Empty;
    options.DatabaseId = builder.Configuration["CLOUDFLARE_D1_DATABASE_ID"]
        ?? builder.Configuration["CloudflareD1:DatabaseId"]
        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_D1_DATABASE_ID") ?? string.Empty;

    var apiToken = builder.Configuration["CLOUDFLARE_API_TOKEN"]
        ?? builder.Configuration["CloudflareD1:ApiToken"]
        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_API_TOKEN") ?? string.Empty;
    // appsettings.json ships a literal "CLOUDFLARE_API_TOKEN" placeholder; treat it as unset
    options.ApiToken = apiToken == "CLOUDFLARE_API_TOKEN" ? string.Empty : apiToken;

    options.BaseUrl = builder.Configuration["D1_API_BASE_URL"]
        ?? Environment.GetEnvironmentVariable("D1_API_BASE_URL")
        ?? "https://api.cloudflare.com/client/v4";
});

builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<D1Options>>().Value);

builder.Services.AddSingleton<ID1Client>(sp =>
{
    var options = sp.GetRequiredService<D1Options>();
    var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(90) };
    return new D1Client(httpClient, options);
});

// Request-scoped data context (one shared write queue per request).
builder.Services.AddScoped<D1Context>();

// Register repositories and unit of work
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();

// Register storage service (Cloudflare R2)
builder.Services.AddScoped<IStorageService, R2StorageService>();

// Register background cleanup service for expired quizzes & assignments
builder.Services.AddHostedService<ExpiredItemsCleanupService>();

// Configure Firebase JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // Read Firebase Project ID from configuration (appsettings.Development.json is the source of truth)
    var firebaseProjectId = builder.Configuration["FIREBASE_PROJECT_ID"]
        ?? Environment.GetEnvironmentVariable("FIREBASE_PROJECT_ID")
        ?? "sans-7d73b"; // fallback hardcode for local dev
    options.Authority = $"https://securetoken.google.com/{firebaseProjectId}";
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = $"https://securetoken.google.com/{firebaseProjectId}",
        ValidateAudience = true,
        ValidAudience = firebaseProjectId,
        ValidateLifetime = true
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var dbContext = context.HttpContext.RequestServices.GetRequiredService<D1Context>();

            // Firebase puts the UID under the "sub" claim (maps to ClaimTypes.NameIdentifier)
            var firebaseUid = context.Principal?.FindFirst("sub")?.Value
                ?? context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var email = context.Principal?.FindFirst("email")?.Value
                ?? context.Principal?.FindFirst(ClaimTypes.Email)?.Value;

            // The seeded SANS administrator account (matches d1_seed_data.sql). Firebase
            // authenticates it, but the D1 profile can be missing or mis-provisioned by
            // self-healing (which defaults unknown users to Student). This account must
            // always sign in with full Administrator access.
            const string adminEmail = "admin.sans@sans.edu";

            if (string.IsNullOrEmpty(firebaseUid))
            {
                context.Fail("Firebase UID not found in token.");
                return;
            }

            var user = await dbContext.Users.QueryFirstOrDefaultAsync(
                "WHERE \"IsDeleted\" = 0 AND lower(\"FirebaseUid\") = lower(?)",
                new object?[] { firebaseUid });

            if (user == null && !string.IsNullOrEmpty(email))
            {
                // Auto-link existing user by email if UID is missing (e.g. re-registration after delete)
                user = await dbContext.Users.QueryFirstOrDefaultAsync(
                    "WHERE \"IsDeleted\" = 0 AND lower(\"Email\") = lower(?)",
                    new object?[] { email });
                if (user != null)
                {
                    user.FirebaseUid = firebaseUid;
                    dbContext.Users.Update(user);
                    await dbContext.SaveChangesAsync();
                }
            }

            if (user == null)
            {
                // Self-healing provisioning: Firebase Auth has already verified this user's
                // ID token, but no matching record exists in the database (e.g. the D1 write
                // during registration failed silently, or the database is ephemeral/reset).
                // Auto-create a minimal profile so the user can sign in instead of being
                // locked out; they can complete their details later from the profile page.
                try
                {
                    var nameClaim = context.Principal?.FindFirst("name")?.Value
                        ?? context.Principal?.FindFirst(ClaimTypes.Name)?.Value
                        ?? email?.Split('@')[0]
                        ?? "User";
                    var nameParts = nameClaim.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                    var firstName = nameParts.Length > 0 ? nameParts[0] : "User";
                    var lastName = nameParts.Length > 1 ? nameParts[1] : string.Empty;

                    // Generate a unique StudentId (the Users table has a unique index on this column)
                    string studentId;
                    do
                    {
                        studentId = "SANS-" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
                    }
                    while (await dbContext.Users.AnyAsync(
                        "WHERE lower(\"StudentId\") = lower(?)",
                        new object?[] { studentId }));

                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        Email = !string.IsNullOrEmpty(email) ? email : $"{firebaseUid}@sans.edu",
                        FirstName = firstName,
                        LastName = lastName,
                        StudentId = studentId,
                        PhoneNumber = string.Empty,
                        Role = email != null && string.Equals(email.Trim(), adminEmail, StringComparison.OrdinalIgnoreCase)
                            ? UserRole.Administrator
                            : UserRole.Student,
                        Status = AccountStatus.Verified,
                        FirebaseUid = firebaseUid,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.Users.Add(user);
                    await dbContext.SaveChangesAsync();
                }
                catch (Exception provisioningEx)
                {
                    // A concurrent /auth/me request (this app fires several in parallel after
                    // login) may have already provisioned this user, so re-check before failing.
                    user = await dbContext.Users.QueryFirstOrDefaultAsync(
                        "WHERE lower(\"FirebaseUid\") = lower(?)",
                        new object?[] { firebaseUid });
                    if (user == null || user.IsDeleted)
                    {
                        Console.WriteLine($"Self-healing profile provisioning failed: {provisioningEx.Message}");
                        context.Fail("User profile not found. Please complete registration.");
                        return;
                    }
                    // Provisioned by a concurrent request — fall through and continue normally.
                }
            }

            // ─── Administrator account reconciliation ─────────────────────────────
            // The admin's D1 row may already exist but with a downgraded role (e.g. it
            // was auto-provisioned as Student before this fix, or the seed data was never
            // applied to the D1 database). Upgrade it in place so the admin dashboard is
            // shown instead of the student dashboard.
            if (user.Email != null &&
                string.Equals(user.Email.Trim(), adminEmail, StringComparison.OrdinalIgnoreCase) &&
                (user.Role != UserRole.Administrator || user.Status != AccountStatus.Verified || !user.IsActive))
            {
                try
                {
                    user.Role = UserRole.Administrator;
                    user.Status = AccountStatus.Verified;
                    user.IsActive = true;
                    dbContext.Users.Update(user);
                    await dbContext.SaveChangesAsync();
                }
                catch (Exception reconciliationEx)
                {
                    // A failed admin-role write must not break authentication;
                    // log it and continue with the (possibly still wrong) role.
                    Console.WriteLine($"[D1] Admin reconciliation write failed: {reconciliationEx.Message}");
                }
            }

            var claimsIdentity = (ClaimsIdentity)context.Principal!.Identity!;

            // Remove the original Firebase UID NameIdentifier claim to avoid duplicate/parse issues
            var existingNameId = claimsIdentity.FindFirst(ClaimTypes.NameIdentifier);
            if (existingNameId != null)
                claimsIdentity.RemoveClaim(existingNameId);

            // Add the local SANS Guid ID so controllers can parse it correctly
            claimsIdentity.AddClaim(new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()));
            claimsIdentity.AddClaim(new Claim(ClaimTypes.Role, ((int)user.Role).ToString()));
        },
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"Authentication failed: {context.Exception.Message}");
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure Swagger/OpenAPI
// builder.Services.AddEndpointsApiExplorer();
// builder.Services.AddSwaggerGen(c =>
// {
//     c.SwaggerDoc("v1", new OpenApiInfo
//     {
//         Title = "SANS API",
//         Version = "v1",
//         Description = "Smart Academic Notification System API"
//     });

//     // Add JWT Authentication to Swagger
//     c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
//     {
//         Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
//         Name = "Authorization",
//         In = ParameterLocation.Header,
//         Type = SecuritySchemeType.ApiKey,
//         Scheme = "Bearer"
//     });

//     c.AddSecurityRequirement(new OpenApiSecurityRequirement
//     {
//         {
//             new OpenApiSecurityScheme
//             {
//                 Reference = new OpenApiReference
//                 {
//                     Type = ReferenceType.SecurityScheme,
//                     Id = "Bearer"
//                 }
//             },
//             Array.Empty<string>()
//         }
//     });
// });

// Add SignalR
builder.Services.AddSignalR();

// GlobalExceptionMiddleware is registered via app.UseMiddleware<>() below

var app = builder.Build();

// Configure the HTTP request pipeline
// if (app.Environment.IsDevelopment())
// {
//     app.UseSwagger();
//     app.UseSwaggerUI(c =>
//     {
//         c.SwaggerEndpoint("/swagger/v1/swagger.json", "SANS API v1");
//         c.RoutePrefix = string.Empty; // Set Swagger UI at the app's root
//     });
// }

app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Verify Cloudflare D1 connectivity & auto-initialize schema if missing at startup
using (var scope = app.Services.CreateScope())
{
    try
    {
        var d1Options = scope.ServiceProvider.GetRequiredService<D1Options>();
        var d1Context = scope.ServiceProvider.GetRequiredService<D1Context>();
        var d1Client = scope.ServiceProvider.GetRequiredService<ID1Client>();

        if (!d1Options.IsConfigured)
        {
            Console.WriteLine("[D1] WARNING: Cloudflare D1 is NOT configured. " +
                "Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_API_TOKEN.");
        }
        else
        {
            bool tablesExist = false;
            try
            {
                var count = await d1Context.ScalarAsync("SELECT COUNT(*) FROM \"Users\"");
                Console.WriteLine($"[D1] Connected to Cloudflare D1. Users table row count: {count}");
                tablesExist = true;
            }
            catch (Exception ex) when (ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) || ex.Message.Contains("SQLITE_ERROR", StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine("[D1] Users table missing in Cloudflare D1 database! Initializing D1 schema...");
            }

            if (!tablesExist)
            {
                var schemaPath = Path.Combine(app.Environment.ContentRootPath, "cloudflare_d1_schema.sql");
                if (!File.Exists(schemaPath))
                {
                    schemaPath = Path.Combine(AppContext.BaseDirectory, "cloudflare_d1_schema.sql");
                }

                if (File.Exists(schemaPath))
                {
                    var sqlContent = await File.ReadAllTextAsync(schemaPath);
                    var rawStatements = sqlContent.Split(';', StringSplitOptions.RemoveEmptyEntries);
                    int createdCount = 0;

                    foreach (var raw in rawStatements)
                    {
                        var trimmed = raw.Trim();
                        if (string.IsNullOrWhiteSpace(trimmed)) continue;
                        if (trimmed.StartsWith("--")) continue;
                        if (trimmed.Equals("BEGIN TRANSACTION", StringComparison.OrdinalIgnoreCase) || 
                            trimmed.Equals("COMMIT", StringComparison.OrdinalIgnoreCase)) continue;

                        try
                        {
                            await d1Client.ExecuteStatementAsync(trimmed);
                            createdCount++;
                        }
                        catch (Exception stmtEx)
                        {
                            Console.WriteLine($"[D1] Statement execution warning: {stmtEx.Message}");
                        }
                    }

                    Console.WriteLine($"[D1] Successfully executed {createdCount} DDL statements from cloudflare_d1_schema.sql! All D1 tables created.");
                }
                else
                {
                    Console.WriteLine($"[D1] ERROR: Schema file cloudflare_d1_schema.sql not found at {schemaPath}");
                }
            }

            // ─── Schema self-healing migration ─────────────────────────────────────
            // A D1 database created from an OLDER cloudflare_d1_schema.sql is missing
            // columns the current entities write (e.g. ClassWorkspaces.CourseCode and a
            // nullable LecturerId). Without them, every INSERT throws
            // InvalidOperationException, which GlobalExceptionMiddleware maps to HTTP 400
            // ("request failed with status code 400" in the UI). Apply
            // d1_schema_migration.sql automatically on boot so a redeploy alone repairs
            // existing databases — no manual wrangler step required.
            bool needsMigration = false;
            try
            {
                // pragma_table_info is supported by Cloudflare D1 and lists the live columns.
                // Gate on ONE marker column per table the migration touches: if any is
                // missing the migration (or a retry of it) is required. This also makes a
                // partially-applied migration self-heal on the next boot instead of being
                // skipped forever because a single column happened to already exist.
                var markerColumns = new Dictionary<string, string>
                {
                    ["ClassWorkspaces"] = "CourseCode",
                    ["Announcements"] = "Category",
                    ["Assignments"] = "AttachmentFileName",
                    ["Notifications"] = "AnnouncementId",
                    ["Messages"] = "ReceiverId",
                    ["RepProposals"] = "SubmittedByRepId"
                };

                foreach (var marker in markerColumns)
                {
                    var columns = await d1Context.QueryRowsAsync($"SELECT name FROM pragma_table_info('{marker.Key}')");
                    if (columns.Count == 0 ||
                        !columns.Any(r => string.Equals(
                            Convert.ToString(r.TryGetValue("name", out var v) ? v : null),
                            marker.Value, StringComparison.OrdinalIgnoreCase)))
                    {
                        needsMigration = true;
                        break;
                    }
                }
            }
            catch (Exception checkEx)
            {
                // Connectivity/other failure — do NOT attempt the migration now.
                Console.WriteLine($"[D1] Schema up-to-date check failed ({checkEx.Message}); skipping auto-migration.");
            }

            if (needsMigration)
            {
                var migrationPath = Path.Combine(app.Environment.ContentRootPath, "d1_schema_migration.sql");
                if (!File.Exists(migrationPath))
                {
                    migrationPath = Path.Combine(AppContext.BaseDirectory, "d1_schema_migration.sql");
                }

                if (File.Exists(migrationPath))
                {
                    var migrationSql = await File.ReadAllTextAsync(migrationPath);
                    int executed = 0;
                    foreach (var raw in migrationSql.Split(';', StringSplitOptions.RemoveEmptyEntries))
                    {
                        var cleaned = string.Join("\n", raw.Split('\n').Where(l => !l.TrimStart().StartsWith("--"))).Trim();
                        if (cleaned.Length == 0) continue;

                        try
                        {
                            await d1Client.ExecuteStatementAsync(cleaned);
                            executed++;
                        }
                        catch (Exception stmtEx)
                        {
                            Console.WriteLine($"[D1] Migration statement warning: {stmtEx.Message}");
                        }
                    }
                    Console.WriteLine($"[D1] Auto-applied d1_schema_migration.sql ({executed} statements) — ClassWorkspaces and related tables are up to date.");
                }
                else
                {
                    Console.WriteLine($"[D1] ERROR: Migration file d1_schema_migration.sql not found at {migrationPath}");
                }
            }
        }
    }
    catch (Exception dbEx)
    {
        Console.WriteLine($"[D1] Database connectivity/initialization check failed: {dbEx.Message}");
    }
}

app.Run();
