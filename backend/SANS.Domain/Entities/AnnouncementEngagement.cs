using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class AnnouncementEngagement : BaseEntity
{
    public Guid AnnouncementId { get; set; }
    public Guid UserId { get; set; }
    public string ActionType { get; set; } = string.Empty; // "View", "Download", "Bookmark"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Announcement Announcement { get; set; } = null!;
    public User User { get; set; } = null!;
}
