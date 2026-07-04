using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class Schedule : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public Guid DepartmentId { get; set; }
    public bool IsRecurring { get; set; }
    public string? RecurrencePattern { get; set; }
    public Guid? InstructorId { get; set; }
    
    // Navigation properties
    public Department Department { get; set; } = null!;
    public User? Instructor { get; set; }
}
