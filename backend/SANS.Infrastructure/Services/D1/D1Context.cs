using SANS.Domain.Entities;

namespace SANS.Infrastructure.Services.D1;

/// <summary>
/// Request-scoped replacement for the old EF Core DbContext. Exposes one
/// <see cref="D1Table{T}"/> per entity, queues writes and flushes them atomically
/// through <see cref="SaveChangesAsync"/>, and provides raw-row helpers for
/// projections/joins plus helpers for the ClassEnrollments many-to-many table.
/// </summary>
public class D1Context : IDisposable
{
    private readonly ID1Client _client;
    private readonly List<(string Sql, object?[]? Parameters)> _pending = new();
    private readonly Dictionary<Type, object> _tables = new();

    public D1Context(ID1Client client)
    {
        _client = client;
    }

    public D1Table<User> Users => (D1Table<User>)GetTable(typeof(User));
    public D1Table<Department> Departments => (D1Table<Department>)GetTable(typeof(Department));
    public D1Table<RefreshToken> RefreshTokens => (D1Table<RefreshToken>)GetTable(typeof(RefreshToken));
    public D1Table<Announcement> Announcements => (D1Table<Announcement>)GetTable(typeof(Announcement));
    public D1Table<Notification> Notifications => (D1Table<Notification>)GetTable(typeof(Notification));
    public D1Table<Assignment> Assignments => (D1Table<Assignment>)GetTable(typeof(Assignment));
    public D1Table<AssignmentSubmission> AssignmentSubmissions => (D1Table<AssignmentSubmission>)GetTable(typeof(AssignmentSubmission));
    public D1Table<LearningResource> LearningResources => (D1Table<LearningResource>)GetTable(typeof(LearningResource));
    public D1Table<Message> Messages => (D1Table<Message>)GetTable(typeof(Message));
    public D1Table<Channel> Channels => (D1Table<Channel>)GetTable(typeof(Channel));
    public D1Table<ChannelMember> ChannelMembers => (D1Table<ChannelMember>)GetTable(typeof(ChannelMember));
    public D1Table<Schedule> Schedules => (D1Table<Schedule>)GetTable(typeof(Schedule));
    public D1Table<Exam> Exams => (D1Table<Exam>)GetTable(typeof(Exam));
    public D1Table<AuditLog> AuditLogs => (D1Table<AuditLog>)GetTable(typeof(AuditLog));
    public D1Table<ClassWorkspace> ClassWorkspaces => (D1Table<ClassWorkspace>)GetTable(typeof(ClassWorkspace));
    public D1Table<Bookmark> Bookmarks => (D1Table<Bookmark>)GetTable(typeof(Bookmark));
    public D1Table<AnnouncementEngagement> AnnouncementEngagements => (D1Table<AnnouncementEngagement>)GetTable(typeof(AnnouncementEngagement));
    public D1Table<Quiz> Quizzes => (D1Table<Quiz>)GetTable(typeof(Quiz));
    public D1Table<DiscussionThread> DiscussionThreads => (D1Table<DiscussionThread>)GetTable(typeof(DiscussionThread));
    public D1Table<DiscussionReply> DiscussionReplies => (D1Table<DiscussionReply>)GetTable(typeof(DiscussionReply));
    public D1Table<DiscussionAttachment> DiscussionAttachments => (D1Table<DiscussionAttachment>)GetTable(typeof(DiscussionAttachment));
    public D1Table<RepProposal> RepProposals => (D1Table<RepProposal>)GetTable(typeof(RepProposal));

    public D1Table<T> Table<T>() where T : class, new() => (D1Table<T>)GetTable(typeof(T));

    /// <summary>
    /// Enumerates every D1Table-backed entity mapping (table name + mapped columns) so
    /// the startup schema repairer can verify/repair the live D1 schema against it.
    /// </summary>
    internal List<(string TableName, D1Column[] Columns)> GetTables()
    {
        var result = new List<(string, D1Column[])>();
        var tableProps = typeof(D1Context)
            .GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
            .Where(p => p.PropertyType.IsGenericType && p.PropertyType.GetGenericTypeDefinition() == typeof(D1Table<>));
        foreach (var prop in tableProps)
        {
            var table = prop.GetValue(this)!;
            var tableName = (string)prop.PropertyType.GetProperty(nameof(D1Table<object>.TableName))!.GetValue(table)!;
            var columns = (D1Column[])prop.PropertyType
                .GetProperty(nameof(D1Table<object>.Columns), System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!
                .GetValue(table)!;
            result.Add((tableName, columns));
        }
        return result;
    }

    private object GetTable(Type type)
    {
        if (_tables.TryGetValue(type, out var table))
        {
            return table;
        }
        table = Activator.CreateInstance(
            typeof(D1Table<>).MakeGenericType(type),
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic,
            null,
            new object[] { _client, this },
            null)!;
        _tables[type] = table;
        return table;
    }

    internal void Enqueue(string sql, object?[]? parameters = null) => _pending.Add((sql, parameters));

    /// <summary>
    /// Flushes all queued writes as a single atomic D1 batch. Returns the number of statements executed.
    /// </summary>
    public async Task<int> SaveChangesAsync()
    {
        if (_pending.Count == 0)
        {
            return 0;
        }

        var statements = _pending.ToList();
        _pending.Clear();
        await _client.ExecuteBatchAsync(statements);
        return statements.Count;
    }

    // ─── Raw row helpers (projections / joins / aggregates) ────────────────────

    public async Task<List<Dictionary<string, object?>>> QueryRowsAsync(string sql, object?[]? parameters = null)
    {
        var result = await _client.ExecuteStatementAsync(sql, parameters);
        return result.Rows.ToList();
    }

    public async Task<Dictionary<string, object?>?> QueryRowAsync(string sql, object?[]? parameters = null)
    {
        var result = await _client.ExecuteStatementAsync(sql, parameters);
        return result.Rows.Count > 0 ? result.Rows[0] : null;
    }

    public async Task<long> ScalarAsync(string sql, object?[]? parameters = null)
    {
        var result = await _client.ExecuteStatementAsync(sql, parameters);
        if (result.Rows.Count > 0 && result.Rows[0].Count > 0)
        {
            return Convert.ToInt64(result.Rows[0].Values.FirstOrDefault() ?? 0L);
        }
        return 0;
    }

    // ─── ClassEnrollments (many-to-many ClassWorkspace <-> User) ───────────────

    public async Task<List<Guid>> GetEnrolledClassIdsAsync(Guid userId)
    {
        var rows = await QueryRowsAsync(
            "SELECT \"EnrolledClassesId\" FROM \"ClassEnrollments\" WHERE lower(\"StudentsId\") = lower(?)", new object?[] { userId });
        return rows.Select(r => D1ValueConverter.ParseGuid(r.TryGetValue("EnrolledClassesId", out var v) ? v : null)).ToList();
    }

    public async Task<List<User>> GetEnrolledStudentsAsync(Guid classId)
    {
        var rows = await QueryRowsAsync(
            "SELECT u.* FROM \"Users\" u INNER JOIN \"ClassEnrollments\" ce ON lower(u.\"Id\") = lower(ce.\"StudentsId\") " +
            "WHERE lower(ce.\"EnrolledClassesId\") = lower(?)", new object?[] { classId });
        return Users.MapRows(rows);
    }

    public async Task<bool> IsEnrolledAsync(Guid classId, Guid userId)
    {
        var count = await ScalarAsync(
            "SELECT COUNT(*) FROM \"ClassEnrollments\" WHERE lower(\"EnrolledClassesId\") = lower(?) AND lower(\"StudentsId\") = lower(?)",
            new object?[] { classId, userId });
        return count > 0;
    }

    public async Task<int> CountEnrolledAsync(Guid classId)
    {
        return (int)await ScalarAsync(
            "SELECT COUNT(*) FROM \"ClassEnrollments\" WHERE lower(\"EnrolledClassesId\") = lower(?)", new object?[] { classId });
    }

    public void Enroll(Guid classId, Guid userId) => Enqueue(
        "INSERT OR IGNORE INTO \"ClassEnrollments\" (\"EnrolledClassesId\", \"StudentsId\") VALUES (?, ?)",
        new object?[] { classId, userId });

    public void Unenroll(Guid classId, Guid userId) => Enqueue(
        "DELETE FROM \"ClassEnrollments\" WHERE lower(\"EnrolledClassesId\") = lower(?) AND lower(\"StudentsId\") = lower(?)",
        new object?[] { classId, userId });

    public void Dispose()
    {
        _pending.Clear();
        _tables.Clear();
    }
}
