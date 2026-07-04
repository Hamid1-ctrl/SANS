using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class Exam : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime ExamDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public decimal MaxPoints { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public bool IsPublished { get; set; }
    
    // Navigation properties
    public Department Department { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
