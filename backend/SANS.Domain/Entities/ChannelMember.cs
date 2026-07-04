using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class ChannelMember : AuditableEntity
{
    public Guid ChannelId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; }
    
    // Navigation properties
    public Channel Channel { get; set; } = null!;
    public User User { get; set; } = null!;
}
