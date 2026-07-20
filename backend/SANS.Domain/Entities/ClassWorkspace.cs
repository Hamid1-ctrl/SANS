using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class ClassWorkspace : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid? LecturerId { get; set; }           // Nullable: null when Rep creates class awaiting lecturer
    public Guid? CreatedByUserId { get; set; }      // Who originally created (Lecturer or Rep)
    public string? CourseCode { get; set; }          // e.g. "CS301"
    public string? DepartmentText { get; set; }      // Department name (free text)
    public string? AcademicLevel { get; set; }       // "100" | "200" | "300" | "400" | "Postgraduate"
    public string? Semester { get; set; }            // "First" | "Second" | "Third"
    
    // Navigation properties
    public User? Lecturer { get; set; }
    public Guid? ClassRepresentativeId { get; set; }
    public User? ClassRepresentative { get; set; }
    public ICollection<User> Students { get; set; } = new List<User>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public ICollection<LearningResource> LearningResources { get; set; } = new List<LearningResource>();
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
    public ICollection<Channel> Channels { get; set; } = new List<Channel>();
    public ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
}
