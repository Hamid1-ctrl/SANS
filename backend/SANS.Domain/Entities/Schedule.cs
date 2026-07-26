using System;
using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class Schedule : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    public string CourseCode { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;

    public int DayOfWeek { get; set; } = 1; // 1 = Monday, 2 = Tuesday, ... 7 = Sunday
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }

    public string Building { get; set; } = string.Empty; // e.g. Engineering Block, Science Complex
    public string Room { get; set; } = string.Empty; // e.g. SR1, SR2, SR3, Lecture Hall A, Computer Lab 2
    public string Location { get; set; } = string.Empty; // e.g. Building - Room

    public string LectureType { get; set; } = "Lecture"; // Lecture, Laboratory, Tutorial, Seminar, Examination
    public string LecturerName { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;

    public bool IsMaster { get; set; } = false; // Master / University reference slot
    public bool IsPublished { get; set; } = true;

    public string AcademicLevel { get; set; } = "Level 300";
    public string Semester { get; set; } = "Semester 1";

    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; }
    public long? FileSize { get; set; }

    public Guid? DepartmentId { get; set; }
    public bool IsRecurring { get; set; } = true;
    public string? RecurrencePattern { get; set; } = "Weekly";
    
    public Guid? InstructorId { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
    
    // Navigation properties
    public Department? Department { get; set; }
    public User? Instructor { get; set; }
    public ClassWorkspace? ClassWorkspace { get; set; }
}
