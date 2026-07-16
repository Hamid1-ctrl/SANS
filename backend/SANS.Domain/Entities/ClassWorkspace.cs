using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class ClassWorkspace : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid LecturerId { get; set; }
    
    // Navigation properties
    public User Lecturer { get; set; } = null!;
    public ICollection<User> Students { get; set; } = new List<User>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public ICollection<LearningResource> LearningResources { get; set; } = new List<LearningResource>();
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
    public ICollection<Channel> Channels { get; set; } = new List<Channel>();
    public ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
}
