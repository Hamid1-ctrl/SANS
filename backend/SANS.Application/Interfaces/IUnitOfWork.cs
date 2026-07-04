using SANS.Application.Interfaces.Repositories;

namespace SANS.Application.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IDepartmentRepository Departments { get; }
    IRefreshTokenRepository RefreshTokens { get; }
    IAnnouncementRepository Announcements { get; }
    INotificationRepository Notifications { get; }
    IAssignmentRepository Assignments { get; }
    IAssignmentSubmissionRepository AssignmentSubmissions { get; }
    ILearningResourceRepository LearningResources { get; }
    IMessageRepository Messages { get; }
    IChannelRepository Channels { get; }
    IScheduleRepository Schedules { get; }
    IExamRepository Exams { get; }
    IAuditLogRepository AuditLogs { get; }
    
    Task<int> SaveChangesAsync();
}
