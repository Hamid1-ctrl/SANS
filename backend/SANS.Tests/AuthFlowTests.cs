using Microsoft.Extensions.Configuration;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;
using SANS.Infrastructure.Repositories;
using SANS.Infrastructure.Services.D1;
using SANS.WebAPI.Services;

namespace SANS.Tests;

/// <summary>
/// End-to-end integration tests for the D1 data layer and the authentication flow.
/// The real D1Client talks to an in-process mock of the Cloudflare D1 REST API
/// (backed by in-memory SQLite with the real schema), so SQL generation, parameter
/// binding, value conversion, batching and the repository/service layers are all
/// exercised exactly as they run in production.
/// </summary>
public class AuthFlowTests
{
    private sealed class TestHarness : IDisposable
    {
        public D1MockServer Server { get; }
        public D1Context Context { get; }
        public IUnitOfWork UnitOfWork { get; }
        public AuthService AuthService { get; }
        public UserRepository Users { get; }

        public TestHarness()
        {
            Server = new D1MockServer();
            var options = new D1Options
            {
                AccountId = "test-account",
                DatabaseId = "test-database",
                ApiToken = "test-token",
                // The real D1Client expects BaseUrl to include the /client/v4 prefix
                BaseUrl = Server.BaseUrl.TrimEnd('/') + "/client/v4"
            };
            var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
            var client = new D1Client(httpClient, options);
            Context = new D1Context(client);
            UnitOfWork = new UnitOfWork(Context);
            Users = new UserRepository(Context);
            AuthService = new AuthService(
                Users,
                new RefreshTokenRepository(Context),
                UnitOfWork,
                CreateConfig());
        }

        private static IConfiguration CreateConfig()
        {
            var values = new Dictionary<string, string?>
            {
                ["JwtSettings:SecretKey"] = "TestSecretKeyThatIsAtLeast32CharactersLong!!",
                ["JwtSettings:Issuer"] = "SANS",
                ["JwtSettings:Audience"] = "SANSUsers",
                ["JwtSettings:ExpiryMinutes"] = "60"
            };
            return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        }

        public void Dispose()
        {
            Context.Dispose();
            Server.Dispose();
        }
    }

    [Fact]
    public async Task Register_Then_Login_Works_EndToEnd()
    {
        using var harness = new TestHarness();

        var (accessToken, refreshToken, user) = await harness.AuthService.RegisterAsync(
            "jane.doe@example.com",
            "password123",
            "Jane",
            "Doe",
            "SANS-TEST-001",
            "+15551234567",
            (int)UserRole.Student);

        Assert.False(string.IsNullOrEmpty(accessToken));
        Assert.False(string.IsNullOrEmpty(refreshToken));
        Assert.Equal("jane.doe@example.com", user.Email);
        Assert.Equal(UserRole.Student, user.Role);
        Assert.Equal(AccountStatus.Verified, user.Status);
        Assert.True(user.IsActive);

        // Case-insensitive email lookup (the original bug: new users not found)
        var found = await harness.Users.GetByEmailAsync("JANE.DOE@example.com");
        Assert.NotNull(found);
        Assert.Equal(user.Id, found!.Id);
        Assert.Equal("jane.doe@example.com", found.Email);

        // Login with different casing succeeds
        var login = await harness.AuthService.LoginAsync("Jane.Doe@Example.com", "password123");
        Assert.Equal(user.Id, login.user.Id);
        Assert.NotNull(login.user.LastLoginAt);

        // Wrong password is rejected
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => harness.AuthService.LoginAsync("jane.doe@example.com", "wrong-password"));
    }

    [Fact]
    public async Task Duplicate_Email_Registration_Throws()
    {
        using var harness = new TestHarness();

        await harness.AuthService.RegisterAsync(
            "dup@example.com", "password1", "A", "B", "SANS-DUP-001", "123", (int)UserRole.Student);

        await Assert.ThrowsAsync<InvalidOperationException>(() => harness.AuthService.RegisterAsync(
            "dup@example.com", "password2", "A", "B", "SANS-DUP-002", "123", (int)UserRole.Student));
    }

    [Fact]
    public async Task SelfHealing_Provisioning_User_Is_Found_By_FirebaseUid()
    {
        using var harness = new TestHarness();

        // Mirrors the OnTokenValidated self-healing provisioning in Program.cs:
        // a Firebase-verified user with no DB record gets a minimal profile.
        var firebaseUid = "firebase-uid-self-heal-123";
        var provisioned = new User
        {
            Id = Guid.NewGuid(),
            Email = "healed.user@example.com",
            FirstName = "Healed",
            LastName = "User",
            StudentId = "SANS-HEAL-001",
            PhoneNumber = string.Empty,
            Role = UserRole.Student,
            Status = AccountStatus.Verified,
            FirebaseUid = firebaseUid,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        harness.Context.Users.Add(provisioned);
        await harness.Context.SaveChangesAsync();

        // The same query Program.cs uses to locate the user on the next request
        var found = await harness.Context.Users.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"FirebaseUid\") = lower(?)",
            new object?[] { firebaseUid });

        Assert.NotNull(found);
        Assert.Equal(provisioned.Id, found!.Id);
        Assert.Equal("healed.user@example.com", found.Email);
    }

    [Fact]
    public async Task Register_Relinks_Profile_When_FirebaseUid_Was_Missing()
    {
        using var harness = new TestHarness();

        // Simulate a profile that exists in D1 but has no Firebase link yet
        // (e.g. created before Firebase auth was wired up).
        var existing = new User
        {
            Id = Guid.NewGuid(),
            Email = "relink@example.com",
            FirstName = "Old",
            LastName = "Name",
            StudentId = "SANS-RELINK-001",
            PhoneNumber = "000",
            Role = UserRole.Student,
            Status = AccountStatus.Verified,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        harness.Context.Users.Add(existing);
        await harness.Context.SaveChangesAsync();

        // Full registration with a fresh Firebase UID upgrades the existing profile
        var (accessToken, _, user) = await harness.AuthService.RegisterAsync(
            "relink@example.com",
            "newpass123",
            "New",
            "Identity",
            "SANS-RELINK-001",
            "+233555555555",
            (int)UserRole.Student,
            firebaseUid: "firebase-uid-relink-999");

        Assert.Equal(existing.Id, user.Id);
        Assert.Equal("New", user.FirstName);
        Assert.Equal("Identity", user.LastName);
        Assert.Equal("firebase-uid-relink-999", user.FirebaseUid);
        Assert.False(string.IsNullOrEmpty(accessToken));
    }

    [Fact]
    public async Task RefreshToken_Flow_Works()
    {
        using var harness = new TestHarness();

        await harness.AuthService.RegisterAsync(
            "token.user@example.com", "password123", "Token", "User", "SANS-TOK-001", "123", (int)UserRole.Student);

        var login = await harness.AuthService.LoginAsync("token.user@example.com", "password123");

        // Refresh with the original refresh token issues a new pair and revokes the old
        var (newAccess, newRefresh) = await harness.AuthService.RefreshTokenAsync(login.refreshToken);
        Assert.False(string.IsNullOrEmpty(newAccess));
        Assert.False(string.IsNullOrEmpty(newRefresh));
        Assert.NotEqual(login.refreshToken, newRefresh);

        // The old token is now revoked and cannot be reused
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => harness.AuthService.RefreshTokenAsync(login.refreshToken));

        // Logout revokes the current token
        Assert.True(await harness.AuthService.LogoutAsync(newRefresh));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => harness.AuthService.RefreshTokenAsync(newRefresh));
    }

    [Fact]
    public async Task SaveChanges_Flushes_All_Queued_Writes_Atomically()
    {
        using var harness = new TestHarness();

        var userIds = new List<Guid>();
        for (var i = 0; i < 3; i++)
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = $"batch{i}@example.com",
                FirstName = $"First{i}",
                LastName = "Last",
                StudentId = $"SANS-BATCH-00{i}",
                PhoneNumber = "000",
                Role = UserRole.Student,
                Status = AccountStatus.Verified,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            userIds.Add(user.Id);
            harness.Context.Users.Add(user);
        }

        var flushed = await harness.Context.SaveChangesAsync();
        Assert.Equal(3, flushed);

        foreach (var id in userIds)
        {
            var user = await harness.Context.Users.FindAsync(id);
            Assert.NotNull(user);
        }
    }

    [Fact]
    public async Task D1Table_RoundTrips_DateTime_Enum_And_Bool()
    {
        using var harness = new TestHarness();

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "types@example.com",
            FirstName = "Types",
            LastName = "Test",
            StudentId = "SANS-TYPES-001",
            PhoneNumber = "123",
            Role = UserRole.Lecturer,
            Status = AccountStatus.Pending,
            IsActive = false,
            LastLoginAt = now,
            CreatedAt = now,
            IsDeleted = false
        };

        harness.Context.Users.Add(user);
        await harness.Context.SaveChangesAsync();

        var loaded = await harness.Context.Users.FindAsync(user.Id);
        Assert.NotNull(loaded);
        Assert.Equal(user.Id, loaded!.Id);
        Assert.Equal(UserRole.Lecturer, loaded.Role);
        Assert.Equal(AccountStatus.Pending, loaded.Status);
        Assert.False(loaded.IsActive);
        Assert.NotNull(loaded.LastLoginAt);
        Assert.Equal(now.ToString("yyyy-MM-dd HH:mm:ss.fffffff"), loaded.LastLoginAt!.Value.ToString("yyyy-MM-dd HH:mm:ss.fffffff"));
    }

    [Fact]
    public async Task AnyAsync_And_CountAsync_Work_With_Where_Clauses()
    {
        using var harness = new TestHarness();

        await harness.AuthService.RegisterAsync(
            "anycount@example.com", "password123", "Any", "Count", "SANS-ANY-001", "123", (int)UserRole.Student);

        // CountAsync with an explicit WHERE
        var count = await harness.Context.Users.CountAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Email\") = lower(?)",
            new object?[] { "anycount@example.com" });
        Assert.Equal(1, count);

        // AnyAsync with an explicit WHERE (duplicate-email guard path)
        Assert.True(await harness.Context.Users.AnyAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Email\") = lower(?)",
            new object?[] { "ANYCOUNT@example.com" }));
        Assert.False(await harness.Context.Users.AnyAsync(
            "WHERE lower(\"Email\") = lower(?)",
            new object?[] { "does-not-exist@example.com" }));

        // Defense-in-depth: a bare predicate (no WHERE keyword) is normalized and still works
        Assert.True(await harness.Context.Users.AnyAsync(
            "lower(\"Email\") = lower(?)",
            new object?[] { "anycount@example.com" }));
    }

    [Fact]
    public async Task Seeded_Admin_Can_Login_With_Default_Password()
    {
        using var harness = new TestHarness();

        // The schema seeds admin.sans@sans.edu with PasswordHash = SHA256("password")
        var login = await harness.AuthService.LoginAsync("admin.sans@sans.edu", "password");
        Assert.Equal("admin.sans@sans.edu", login.user.Email);
        Assert.Equal(UserRole.Administrator, login.user.Role);
    }
}
