using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class Bookmark : BaseEntity
{
    public Guid UserId { get; set; }
    public string EntityType { get; set; } = string.Empty; // e.g. "Announcement", "Assignment", "Resource"
    public Guid EntityId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User User { get; set; } = null!;
}
