using SANS.Domain.Common;
using SANS.Domain.Enums;

namespace SANS.Domain.Entities;

public class Announcement : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsGlobal { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? TargetRoleId { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsPinned { get; set; }
    public int ViewCount { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
    public bool IsVerified { get; set; }
    public string? Status { get; set; } = "General"; // "Verified", "PendingApproval", "Rejected", "General"
    public string? Tags { get; set; } // Comma-separated or hashtag format
    
    // Navigation properties
    public Department? Department { get; set; }
    public ClassWorkspace? ClassWorkspace { get; set; }
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<AnnouncementEngagement> Engagements { get; set; } = new List<AnnouncementEngagement>();
}
