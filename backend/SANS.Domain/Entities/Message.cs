using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class Message : AuditableEntity
{
    public string Content { get; set; } = string.Empty;
    public Guid SenderId { get; set; }
    public Guid ReceiverId { get; set; }
    public Guid? ChannelId { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public string? AttachmentUrl { get; set; }
    
    // Navigation properties
    public User Sender { get; set; } = null!;
    public User Receiver { get; set; } = null!;
    public Channel? Channel { get; set; }
}
