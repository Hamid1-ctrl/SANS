using SANS.Domain.Common;
using SANS.Domain.Enums;

namespace SANS.Domain.Entities;

public class AssignmentSubmission : AuditableEntity
{
    public Guid AssignmentId { get; set; }
    public Guid StudentId { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string? Content { get; set; }
    public string? AttachmentUrl { get; set; }
    public decimal? Grade { get; set; }
    public string? Feedback { get; set; }
    public DateTime? GradedAt { get; set; }
    public Guid? GradedByUserId { get; set; }
    public bool IsLateSubmission { get; set; }
    public AssignmentStatus Status { get; set; }
    
    // Navigation properties
    public Assignment Assignment { get; set; } = null!;
    public User Student { get; set; } = null!;
    public User? GradedByUser { get; set; }
}
