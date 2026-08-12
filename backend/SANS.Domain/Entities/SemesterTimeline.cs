using System;

namespace SANS.Domain.Entities;

public class SemesterTimeline
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClassWorkspaceId { get; set; }
    public string SemesterName { get; set; } = "Semester 1";
    public int TotalWeeks { get; set; } = 16;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddDays(112);
    public DateTime? ExamStartDate { get; set; }
    public string? Notes { get; set; }
    public Guid UpdatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
}
