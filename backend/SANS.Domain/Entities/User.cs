using SANS.Domain.Common;
using SANS.Domain.Enums;

namespace SANS.Domain.Entities;

public class User : AuditableEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public Guid? DepartmentId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string? OfficeNumber { get; set; }
    public string? OfficeHours { get; set; }
    public string? Specialization { get; set; }
    public string? Bio { get; set; }
    public string? DepartmentName { get; set; }
    public string? FirebaseUid { get; set; }
    
    // Navigation properties
    public Department? Department { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<AssignmentSubmission> AssignmentSubmissions { get; set; } = new List<AssignmentSubmission>();
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    public ICollection<Message> ReceivedMessages { get; set; } = new List<Message>();
    public ICollection<ClassWorkspace> EnrolledClasses { get; set; } = new List<ClassWorkspace>();
}
