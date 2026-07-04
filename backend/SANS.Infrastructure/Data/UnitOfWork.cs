using SANS.Application.Interfaces;
using SANS.Application.Interfaces.Repositories;
using SANS.Infrastructure.Repositories;

namespace SANS.Infrastructure.Data;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IUserRepository? _users;
    private IDepartmentRepository? _departments;
    private IRefreshTokenRepository? _refreshTokens;
    private IAnnouncementRepository? _announcements;
    private INotificationRepository? _notifications;
    private IAssignmentRepository? _assignments;
    private IAssignmentSubmissionRepository? _assignmentSubmissions;
    private ILearningResourceRepository? _learningResources;
    private IMessageRepository? _messages;
    private IChannelRepository? _channels;
    private IScheduleRepository? _schedules;
    private IExamRepository? _exams;
    private IAuditLogRepository? _auditLogs;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public IUserRepository Users => _users ??= new UserRepository(_context);
    public IDepartmentRepository Departments => _departments ??= new DepartmentRepository(_context);
    public IRefreshTokenRepository RefreshTokens => _refreshTokens ??= new RefreshTokenRepository(_context);
    public IAnnouncementRepository Announcements => _announcements ??= new AnnouncementRepository(_context);
    public INotificationRepository Notifications => _notifications ??= new NotificationRepository(_context);
    public IAssignmentRepository Assignments => _assignments ??= new AssignmentRepository(_context);
    public IAssignmentSubmissionRepository AssignmentSubmissions => _assignmentSubmissions ??= new AssignmentSubmissionRepository(_context);
    public ILearningResourceRepository LearningResources => _learningResources ??= new LearningResourceRepository(_context);
    public IMessageRepository Messages => _messages ??= new MessageRepository(_context);
    public IChannelRepository Channels => _channels ??= new ChannelRepository(_context);
    public IScheduleRepository Schedules => _schedules ??= new ScheduleRepository(_context);
    public IExamRepository Exams => _exams ??= new ExamRepository(_context);
    public IAuditLogRepository AuditLogs => _auditLogs ??= new AuditLogRepository(_context);

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
