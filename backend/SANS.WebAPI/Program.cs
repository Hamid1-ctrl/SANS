using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SANS.Domain.Entities;
using SANS.Application.Interfaces;
using SANS.Application.Interfaces.Repositories;
using SANS.Application.Interfaces.Services;
using SANS.Infrastructure.Data;
using SANS.Infrastructure.Repositories;
using SANS.Infrastructure.Services;
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

// Configure SQLite Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING")
        ?? "Data Source=sans_local.db"));

// Register repositories and unit of work
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();

// Register storage service
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
            var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            
            // Firebase puts the UID under the "sub" claim (maps to ClaimTypes.NameIdentifier)
            var firebaseUid = context.Principal?.FindFirst("sub")?.Value
                ?? context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var email = context.Principal?.FindFirst("email")?.Value 
                ?? context.Principal?.FindFirst(ClaimTypes.Email)?.Value;

            if (string.IsNullOrEmpty(firebaseUid))
            {
                context.Fail("Firebase UID not found in token.");
                return;
            }

            var user = await dbContext.Users
                .Where(u => !u.IsDeleted)
                .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);
                
            if (user == null && !string.IsNullOrEmpty(email))
            {
                // Auto-link existing user by email if UID is missing (e.g. re-registration after delete)
                user = await dbContext.Users
                    .Where(u => !u.IsDeleted)
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
                if (user != null)
                {
                    user.FirebaseUid = firebaseUid;
                    await dbContext.SaveChangesAsync();
                }
            }

            if (user == null)
            {
                // No D1 record exists for this Firebase UID/email.
                // This is a brand-new user who has NOT completed registration yet.
                // Fail with 401 so the frontend redirects them to the registration flow.
                context.Fail("User profile not found. Please complete registration.");
                return;
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

// Automatically ensure SQLite database tables & schema exist on server startup
using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        dbContext.Database.EnsureCreated();
    }
    catch (Exception dbEx)
    {
        Console.WriteLine($"Database initialization notice: {dbEx.Message}");
    }
}

app.Run();
