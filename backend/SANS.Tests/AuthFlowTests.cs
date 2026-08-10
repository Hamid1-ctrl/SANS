using Microsoft.Extensions.Configuration;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;
using SANS.Infrastructure.Repositories;
using SANS.Infrastructure.Services.D1;
using SANS.WebAPI.Controllers;
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

    /// <summary>
    /// Verifies every D1Table&lt;Entity&gt; exposed by D1Context has a table in the given
    /// database containing every column the entity maps (D1Table.BuildInsert writes ALL
    /// mapped columns) and no NOT NULL columns the entity never writes.
    /// </summary>
    private static List<string> GetSchemaFailures(D1Context context, D1MockServer server)
    {
        var tableProps = typeof(D1Context).GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
            .Where(p => p.PropertyType.IsGenericType && p.PropertyType.GetGenericTypeDefinition() == typeof(D1Table<>))
            .ToList();

        var failures = new List<string>();
        foreach (var prop in tableProps)
        {
            var table = prop.GetValue(context)!;
            var tableName = (string)prop.PropertyType.GetProperty(nameof(D1Table<object>.TableName))!.GetValue(table)!;
            var mapped = (string[])prop.PropertyType
                .GetMethod("GetMappedColumnNames", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!
                .Invoke(table, null)!;

            var actual = server.GetTableColumns(tableName);
            var actualNames = actual.Select(c => c.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missing = mapped.Where(m => !actualNames.Contains(m)).ToList();
            if (missing.Count > 0)
            {
                failures.Add($"Table \"{tableName}\" is missing columns the entity writes: {string.Join(", ", missing)}");
            }

            var unmappedNotNull = actual
                .Where(c => c.NotNull && string.IsNullOrEmpty(c.DefaultValue) && !mapped.Contains(c.Name, StringComparer.OrdinalIgnoreCase))
                .Select(c => c.Name)
                .ToList();
            if (unmappedNotNull.Count > 0)
            {
                failures.Add($"Table \"{tableName}\" has NOT NULL columns the entity never writes (inserts would fail): {string.Join(", ", unmappedNotNull)}");
            }
        }
        return failures;
    }

    [Fact]
    public async Task Schema_Contains_All_Entity_Mapped_Columns()
    {
        using var harness = new TestHarness();

        var failures = GetSchemaFailures(harness.Context, harness.Server);
        Assert.True(failures.Count == 0, "Schema does not match the entities:\n" + string.Join("\n", failures));
    }

    [Fact]
    public async Task Old_D1_Schema_Is_Fully_Repaired_By_Startup_Repairer()
    {
        // Simulates the deployed production database: created from the OLD schema.
        using var server = new D1MockServer(schemaFileName: "old_cloudflare_d1_schema.sql", applySeed: false);

        // Seed one row into each table that gets REBUILT by the migration, so the test
        // proves existing data survives the CREATE-new / COPY / DROP / RENAME dance.
        // Foreign keys are enforced (as in D1), so insert prerequisites first.
        server.ExecuteRawSql("INSERT INTO \"Departments\" (\"Id\", \"Name\", \"Code\", \"Description\", \"IsActive\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dept', 'D1', 'd', 1, '2026-01-01 00:00:00', 0)");
        server.ExecuteRawSql("INSERT INTO \"Users\" (\"Id\", \"FirstName\", \"LastName\", \"Email\", \"PasswordHash\", \"PhoneNumber\", \"StudentId\", \"Role\", \"IsActive\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('22222222-2222-2222-2222-222222222222', 'A', 'B', 'a@b.com', '', '123', 'S1', 0, 1, '2026-01-01 00:00:00', 0)");
        server.ExecuteRawSql("INSERT INTO \"Channels\" (\"Id\", \"Name\", \"Description\", \"IsGroup\", \"DepartmentId\", \"CreatedByUserId\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('33333333-3333-3333-3333-333333333333', 'Chan', 'c', 0, 'dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', '2026-01-01 00:00:00', 0)");
        server.ExecuteRawSql("INSERT INTO \"ClassWorkspaces\" (\"Id\", \"Name\", \"Code\", \"Description\", \"LecturerId\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Class', 'C1', 'x', '22222222-2222-2222-2222-222222222222', '2026-01-01 00:00:00', 0)");
        server.ExecuteRawSql("INSERT INTO \"Messages\" (\"Id\", \"Content\", \"SenderId\", \"ChannelId\", \"SentAt\", \"IsEdited\", \"IsRead\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('11111111-1111-1111-1111-111111111111', 'pre-migration message', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '2026-01-01 00:00:00', 0, 0, '2026-01-01 00:00:00', 0)");
        server.ExecuteRawSql("INSERT INTO \"ChannelMembers\" (\"Id\", \"ChannelId\", \"UserId\", \"Role\", \"JoinedAt\", \"IsMuted\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 0, '2026-01-01 00:00:00', 0, '2026-01-01 00:00:00', 0)");
        server.ExecuteRawSql("INSERT INTO \"RepProposals\" (\"Id\", \"Title\", \"Description\", \"Category\", \"ClassWorkspaceId\", \"SubmittedByUserId\", \"SubmittedByName\", \"Status\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Proposal', 'Details', 'General', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Some Rep', 'Pending', '2026-01-01 00:00:00', 0)");

        var options = new D1Options
        {
            AccountId = "test-account",
            DatabaseId = "test-database",
            ApiToken = "test-token",
            BaseUrl = server.BaseUrl.TrimEnd('/') + "/client/v4"
        };
        var client = new D1Client(new HttpClient { Timeout = TimeSpan.FromSeconds(30) }, options);
        using var context = new D1Context(client);

        // Run the startup repair engine exactly as Program.cs does on boot. Because D1
        // enforces foreign keys, the repairer rebuilds FK children BEFORE their parents
        // so the DROP of a parent can never cascade-delete the child rows seeded below.
        var repairer = new D1SchemaRepairer(client);
        int repaired = await repairer.RepairIfNeededAsync(context);
        Assert.True(repaired > 0, "The old-schema database should require repairs");

        var failures = GetSchemaFailures(context, server);
        Assert.True(failures.Count == 0, "Migrated schema does not match the entities:\n" + string.Join("\n", failures));

        // The rebuilt tables must have preserved the pre-migration rows.
        Assert.Equal(1, await context.ScalarAsync("SELECT COUNT(*) FROM \"Messages\" WHERE \"Content\" = 'pre-migration message'"));
        Assert.Equal(1, await context.ScalarAsync("SELECT COUNT(*) FROM \"ChannelMembers\""));
        Assert.Equal(1, await context.ScalarAsync("SELECT COUNT(*) FROM \"RepProposals\" WHERE \"Title\" = 'Proposal'"));

        // A Course Rep creates a class with NO lecturer — the rebuilt ClassWorkspaces
        // table must accept a NULL LecturerId (the old NOT NULL column rejected it).
        var repClass = new ClassWorkspace
        {
            Id = Guid.NewGuid(),
            Name = "Migrated Rep Class",
            Code = "MIG001",
            Description = string.Empty,
            CourseCode = "CS301",
            DepartmentText = "Computer Science",
            AcademicLevel = "300",
            Semester = "First",
            CreatedByUserId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.ClassWorkspaces.Add(repClass);
        await context.SaveChangesAsync();

        var savedRepClass = await context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Code\") = lower(?)", new object?[] { "MIG001" });
        Assert.NotNull(savedRepClass);
        Assert.Null(savedRepClass!.LecturerId);
        Assert.Equal("First", savedRepClass.Semester);
    }

    [Fact]
    public async Task Rep_Creating_Class_Workspace_Succeeds_Without_Lecturer()
    {
        using var harness = new TestHarness();

        // Course Representative user
        var rep = new User
        {
            Id = Guid.NewGuid(),
            Email = "classrep@example.com",
            FirstName = "Class",
            LastName = "Rep",
            StudentId = "SANS-REP-001",
            PhoneNumber = "123",
            Role = UserRole.ClassRepresentative,
            Status = AccountStatus.Verified,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        harness.Context.Users.Add(rep);
        await harness.Context.SaveChangesAsync();

        // Exercise the real controller action (the flow that failed in production)
        var controller = new ClassWorkspacesController(harness.Context)
        {
            ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
                {
                    User = new System.Security.Claims.ClaimsPrincipal(
                        new System.Security.Claims.ClaimsIdentity(new[]
                        {
                            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, rep.Id.ToString())
                        }))
                }
            }
        };

        var result = await controller.CreateClass(new CreateClassModel
        {
            Name = "Computer Science Level 300",
            Code = "CS300",
            Description = "Rep-created class",
            CourseCode = "CS301",
            Department = "Computer Science",
            AcademicLevel = "300",
            Semester = "Second"
        });

        Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(result);

        var saved = await harness.Context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Code\") = lower(?)", new object?[] { "CS300" });
        Assert.NotNull(saved);
        Assert.Null(saved!.LecturerId); // rep-created => no lecturer yet
        Assert.Equal("Second", saved.Semester);
        Assert.Equal(rep.Id, saved.CreatedByUserId);

        // Duplicate code is still rejected
        var duplicate = await controller.CreateClass(new CreateClassModel { Name = "Dup", Code = "cs300" });
        Assert.IsType<Microsoft.AspNetCore.Mvc.BadRequestObjectResult>(duplicate);
    }

    [Fact]
    public async Task Repair_Engine_Repairs_Old_D1_Database_So_Rep_Can_Create_Class()
    {
        // Simulates the deployed production database: created from the OLD schema,
        // which lacks ClassWorkspaces.CourseCode and keeps LecturerId NOT NULL.
        using var server = new D1MockServer(schemaFileName: "old_cloudflare_d1_schema.sql", applySeed: false);
        var options = new D1Options
        {
            AccountId = "test-account",
            DatabaseId = "test-database",
            ApiToken = "test-token",
            BaseUrl = server.BaseUrl.TrimEnd('/') + "/client/v4"
        };
        var client = new D1Client(new HttpClient { Timeout = TimeSpan.FromSeconds(30) }, options);

        // 1. Reproduce the production 400: writing the current ClassWorkspace entity
        //    (CourseCode column + NULL LecturerId) into the OLD table throws
        //    InvalidOperationException — which GlobalExceptionMiddleware surfaces as
        //    HTTP 400 "Request failed with status code 400" in the UI.
        using (var preContext = new D1Context(client))
        {
            var preRepClass = new ClassWorkspace
            {
                Id = Guid.NewGuid(),
                Name = "Old Schema Class",
                Code = "OLD001",
                Description = string.Empty,
                CourseCode = "CS101",
                DepartmentText = "Computer Science",
                AcademicLevel = "100",
                Semester = "First",
                CreatedByUserId = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            };
            preContext.ClassWorkspaces.Add(preRepClass);
            await Assert.ThrowsAsync<InvalidOperationException>(() => preContext.SaveChangesAsync());
        }

        // 2. The startup up-to-date check Program.cs runs detects the old schema: the
        //    marker columns the migration adds are all missing (any missing one triggers
        //    the migration, so a partial application cannot be skipped forever).
        async Task<HashSet<string>> GetColumnsAsync(string table)
        {
            var cols = await client.ExecuteStatementAsync($"SELECT name FROM pragma_table_info('{table}')");
            return cols.Rows
                .Select(r => Convert.ToString(r.FirstOrDefault().Value))
                .Where(n => !string.IsNullOrEmpty(n))
                .Select(n => n!)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        Assert.DoesNotContain("CourseCode", await GetColumnsAsync("ClassWorkspaces"));
        Assert.DoesNotContain("Category", await GetColumnsAsync("Announcements"));
        Assert.DoesNotContain("ReceiverId", await GetColumnsAsync("Messages"));

        // 3. Run the startup repair engine exactly as Program.cs does on boot.
        using var repairContext = new D1Context(client);
        var repairer = new D1SchemaRepairer(client);
        int repaired = await repairer.RepairIfNeededAsync(repairContext);
        Assert.True(repaired > 0, "The old-schema database should require repairs");

        // 4. The same check now passes — the schema is up to date again.
        Assert.Contains("CourseCode", await GetColumnsAsync("ClassWorkspaces"));
        Assert.Contains("Category", await GetColumnsAsync("Announcements"));
        Assert.Contains("ReceiverId", await GetColumnsAsync("Messages"));

        // 5. A Course Rep can now create a class workspace — the exact flow that
        //    returned 400 before the migration.
        using var context = new D1Context(client);
        var rep = new User
        {
            Id = Guid.NewGuid(),
            Email = "rep.after.migration@example.com",
            FirstName = "Rep",
            LastName = "Migrated",
            StudentId = "SANS-MIG-REP-001",
            PhoneNumber = "123",
            Role = UserRole.ClassRepresentative,
            Status = AccountStatus.Verified,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(rep);
        await context.SaveChangesAsync();

        var controller = new ClassWorkspacesController(context)
        {
            ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
                {
                    User = new System.Security.Claims.ClaimsPrincipal(
                        new System.Security.Claims.ClaimsIdentity(new[]
                        {
                            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, rep.Id.ToString())
                        }))
                }
            }
        };

        var result = await controller.CreateClass(new CreateClassModel
        {
            Name = "Computer Science Level 200",
            Code = "CS200",
            Description = "Created after auto-migration",
            CourseCode = "CS201",
            Department = "Computer Science",
            AcademicLevel = "200",
            Semester = "First"
        });

        Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(result);

        var saved = await context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Code\") = lower(?)", new object?[] { "CS200" });
        Assert.NotNull(saved);
        Assert.Null(saved!.LecturerId);
        Assert.Equal("First", saved.Semester);
        Assert.Equal(rep.Id, saved.CreatedByUserId);
    }

    [Fact]
    public async Task Repair_Engine_Fixes_Old_D1_Database_Preserves_Data_And_Allows_Create()
    {
        // The deployed production database is still on the OLD schema (ClassWorkspaces
        // lacks CourseCode / CreatedByUserId and LecturerId is NOT NULL) — exactly the
        // state that produced "no column named CreatedByUserId" / HTTP 400 on create.
        using var server = new D1MockServer(schemaFileName: "old_cloudflare_d1_schema.sql", applySeed: false);

        // A class created before the repair must survive the automated rebuild.
        // (Foreign keys are enforced in the mock as in D1, so the referenced lecturer
        // must exist first.)
        server.ExecuteRawSql("INSERT INTO \"Users\" (\"Id\", \"FirstName\", \"LastName\", \"Email\", \"PasswordHash\", \"PhoneNumber\", \"StudentId\", \"Role\", \"IsActive\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('22222222-2222-2222-2222-222222222222', 'L', 'T', 'lecturer@example.com', '', '123', 'S1', 1, 1, '2026-01-01 00:00:00', 0)");
        server.ExecuteRawSql("INSERT INTO \"ClassWorkspaces\" (\"Id\", \"Name\", \"Code\", \"Description\", \"LecturerId\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Pre-existing Class', 'PRE001', 'x', '22222222-2222-2222-2222-222222222222', '2026-01-01 00:00:00', 0)");

        // A CHILD row (Announcement -> ClassWorkspaces via ON DELETE CASCADE) must survive
        // the repair: rebuilding a parent must never cascade-delete dependent rows, which
        // is why the repairer rebuilds FK children first (stripping their constraints).
        server.ExecuteRawSql("INSERT INTO \"Announcements\" (\"Id\", \"Title\", \"Content\", \"IsGlobal\", \"IsPinned\", \"ViewCount\", \"IsVerified\", \"ClassWorkspaceId\", \"CreatedAt\", \"IsDeleted\") " +
            "VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pre-repair Announcement', 'child of the pre-existing class', 0, 0, 0, 0, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-01-01 00:00:00', 0)");

        var options = new D1Options
        {
            AccountId = "test-account",
            DatabaseId = "test-database",
            ApiToken = "test-token",
            BaseUrl = server.BaseUrl.TrimEnd('/') + "/client/v4"
        };
        var client = new D1Client(new HttpClient { Timeout = TimeSpan.FromSeconds(30) }, options);
        using var context = new D1Context(client);

        // The repair engine rebuilds every out-of-date table on boot.
        var repairer = new D1SchemaRepairer(client);
        int repaired = await repairer.RepairIfNeededAsync(context);
        Assert.True(repaired > 0, "The old-schema database should require repairs");

        var failures = GetSchemaFailures(context, server);
        Assert.True(failures.Count == 0, "Schema still does not match entities after repair:\n" + string.Join("\n", failures));

        // Pre-existing data survives the rebuild — both the parent row and its child row
        // (no FK cascade deletion).
        Assert.Equal(1, await context.ScalarAsync("SELECT COUNT(*) FROM \"ClassWorkspaces\" WHERE \"Code\" = 'PRE001'"));
        Assert.Equal(1, await context.ScalarAsync("SELECT COUNT(*) FROM \"Announcements\" WHERE \"Id\" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'"));

        // And a Course Rep can now create a class workspace — the exact flow that
        // returned HTTP 400 before.
        var rep = new User
        {
            Id = Guid.NewGuid(),
            Email = "rep.after.repair@example.com",
            FirstName = "Rep",
            LastName = "Repaired",
            StudentId = "SANS-REPAIR-001",
            PhoneNumber = "123",
            Role = UserRole.ClassRepresentative,
            Status = AccountStatus.Verified,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(rep);
        await context.SaveChangesAsync();

        var controller = new ClassWorkspacesController(context)
        {
            ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
                {
                    User = new System.Security.Claims.ClaimsPrincipal(
                        new System.Security.Claims.ClaimsIdentity(new[]
                        {
                            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, rep.Id.ToString())
                        }))
                }
            }
        };

        var result = await controller.CreateClass(new CreateClassModel
        {
            Name = "Rep Class After Repair",
            Code = "REPAIR1",
            Description = "Created after repair",
            CourseCode = "CS400",
            Department = "Computer Science",
            AcademicLevel = "400",
            Semester = "Second"
        });

        Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(result);

        var saved = await context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Code\") = lower(?)", new object?[] { "REPAIR1" });
        Assert.NotNull(saved);
        Assert.Null(saved!.LecturerId);
        Assert.Equal(rep.Id, saved.CreatedByUserId);
    }

    [Fact]
    public async Task Repair_Engine_Is_NoOp_On_UpToDate_Schema()
    {
        using var harness = new TestHarness();
        var client = new D1Client(new HttpClient { Timeout = TimeSpan.FromSeconds(30) }, new D1Options
        {
            AccountId = "test-account",
            DatabaseId = "test-database",
            ApiToken = "test-token",
            BaseUrl = harness.Server.BaseUrl.TrimEnd('/') + "/client/v4"
        });

        // A database created from the current (fixed) schema needs no repairs.
        var repairer = new D1SchemaRepairer(client);
        int repaired = await repairer.RepairIfNeededAsync(harness.Context);
        Assert.Equal(0, repaired);
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
