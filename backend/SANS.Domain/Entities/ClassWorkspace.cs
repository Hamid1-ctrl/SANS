// Import the common namespace containing base entity definitions such as AuditableEntity
using SANS.Domain.Common;

// Define the namespace for SANS domain entity classes
namespace SANS.Domain.Entities;

// ClassWorkspace represents a course/class unit (e.g., Computer Science Level 300)
public class ClassWorkspace : AuditableEntity
{
    // The display name of the class workspace (e.g., "Database Management Systems")
    public string Name { get; set; } = string.Empty;

    // Unique class join code used by students to enroll (e.g., "CS301-8X92")
    public string Code { get; set; } = string.Empty;

    // Brief summary or description of the course workspace
    public string Description { get; set; } = string.Empty;

    // Foreign key pointing to the assigned primary lecturer user account (nullable if unassigned)
    public Guid? LecturerId { get; set; }

    // Foreign key pointing to the user account that originally created this workspace
    public Guid? CreatedByUserId { get; set; }

    // Official university course code identifier (e.g., "CS301")
    public string? CourseCode { get; set; }

    // Academic department name associated with this workspace (e.g., "Computer Science")
    public string? DepartmentText { get; set; }

    // Academic year or level for students in this class (e.g., "100", "200", "300", "400")
    public string? AcademicLevel { get; set; }

    // Academic term or semester designation (e.g., "First", "Second")
    public string? Semester { get; set; }

    // Navigation property linking to the primary lecturer User object
    public User? Lecturer { get; set; }

    // Foreign key pointing to the 1st Course Representative user account (nullable if unassigned)
    public Guid? ClassRepresentativeId { get; set; }

    // Navigation property linking to the 1st Course Representative User object
    public User? ClassRepresentative { get; set; }

    // Foreign key pointing to the 2nd Course Representative user account (nullable if unassigned)
    public Guid? SecondClassRepresentativeId { get; set; }

    // Navigation property linking to the 2nd Course Representative User object
    public User? SecondClassRepresentative { get; set; }

    // Collection of enrolled student users belonging to this class workspace
    public ICollection<User> Students { get; set; } = new List<User>();

    // Collection of official announcements published within this class workspace
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();

    // Collection of coursework assignments created for this class workspace
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();

    // Collection of lecture notes, slides, and learning resources uploaded to this workspace
    public ICollection<LearningResource> LearningResources { get; set; } = new List<LearningResource>();

    // Collection of weekly class timetable schedules created for this workspace
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();

    // Collection of discussion channels/topics under this workspace
    public ICollection<Channel> Channels { get; set; } = new List<Channel>();

    // Collection of academic quizzes scheduled for this workspace
    public ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
}
