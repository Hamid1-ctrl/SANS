using SANS.Domain.Common;
using SANS.Domain.Enums;

namespace SANS.Domain.Entities;

public class Assignment : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public DateTime? PublishedAt { get; set; }
    public decimal MaxPoints { get; set; }
    public AssignmentStatus Status { get; set; }
    public bool AllowLateSubmission { get; set; }
    public decimal? LateSubmissionPenalty { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string? AttachmentUrl { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
    
    // Navigation properties
    public Department Department { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public ClassWorkspace? ClassWorkspace { get; set; }
    public ICollection<AssignmentSubmission> Submissions { get; set; } = new List<AssignmentSubmission>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
