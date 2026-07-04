using SANS.Domain.Common;
using SANS.Domain.Enums;

namespace SANS.Domain.Entities;

public class Notification : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public NotificationPriority Priority { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public Guid UserId { get; set; }
    public Guid? AnnouncementId { get; set; }
    public Guid? AssignmentId { get; set; }
    public string? ActionUrl { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
    public Announcement? Announcement { get; set; }
    public Assignment? Assignment { get; set; }
}
