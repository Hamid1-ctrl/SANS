using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class LearningResource : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Tags { get; set; } = string.Empty;
    public Guid DepartmentId { get; set; }
    public Guid UploadedByUserId { get; set; }
    public int DownloadCount { get; set; }
    
    // Navigation properties
    public Department Department { get; set; } = null!;
    public User UploadedByUser { get; set; } = null!;
}
