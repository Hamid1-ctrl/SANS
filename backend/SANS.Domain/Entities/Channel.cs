using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class Channel : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsGroup { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
    
    // Navigation properties
    public Department Department { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public ClassWorkspace? ClassWorkspace { get; set; }
    public ICollection<Message> Messages { get; set; } = new List<Message>();
    public ICollection<ChannelMember> Members { get; set; } = new List<ChannelMember>();
}
