using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Services.D1;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly D1Context _context;

    public AssignmentsController(IUnitOfWork unitOfWork, D1Context context)
    {
        _unitOfWork = unitOfWork;
        _context = context;
    }

    // GET /api/assignments — Returns coursework assignments accessible to the current user
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        // Soft-delete expired assignments inline
        var now = DateTime.UtcNow;
        var expiredAssignments = (await _context.Assignments.QueryAsync("WHERE \"IsDeleted\" = 0"))
            .Where(a => a.DueDate < now)
            .ToList();

        if (expiredAssignments.Count > 0)
        {
            foreach (var assign in expiredAssignments)
            {
                assign.IsDeleted = true;
                assign.DeletedAt = now;
                assign.UpdatedBy = "Auto Expired Cleanup";
                _context.Assignments.Update(assign);
            }
            await _context.SaveChangesAsync();
        }

        var assignments = await _context.Assignments.QueryAsync("WHERE \"IsDeleted\" = 0");

        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            if (!await _context.IsUserAuthorizedForClassAsync(classId.Value, userId))
            {
                return StatusCode(403, new { Message = "Access denied. You are not enrolled in this class workspace." });
            }

            assignments = assignments
                .Where(a => a.ClassWorkspaceId == classId.Value || a.ClassWorkspaceId == null)
                .ToList();
        }
        else
        {
            // Fetch accessible class workspace IDs for current user (lecturer, student, 1st/2nd Rep, creator)
            var userClassIds = (await _context.QueryRowsAsync(
                "SELECT c.\"Id\" FROM \"ClassWorkspaces\" c WHERE c.\"IsDeleted\" = 0 AND (" +
                "(c.\"LecturerId\" IS NOT NULL AND lower(c.\"LecturerId\") = lower(?)) OR " +
                "(c.\"ClassRepresentativeId\" IS NOT NULL AND lower(c.\"ClassRepresentativeId\") = lower(?)) OR " +
                "(c.\"SecondClassRepresentativeId\" IS NOT NULL AND lower(c.\"SecondClassRepresentativeId\") = lower(?)) OR " +
                "(c.\"CreatedByUserId\" IS NOT NULL AND lower(c.\"CreatedByUserId\") = lower(?)) OR " +
                "EXISTS (SELECT 1 FROM \"ClassEnrollments\" ce WHERE ce.\"EnrolledClassesId\" = c.\"Id\" AND lower(ce.\"StudentsId\") = lower(?)))",
                new object?[] { userId, userId, userId, userId, userId }))
                .Select(r => D1ValueConverter.ParseGuid(r.TryGetValue("Id", out var v) ? v : null))
                .ToList();

            assignments = assignments
                .Where(a => a.ClassWorkspaceId == null || (a.ClassWorkspaceId != null && userClassIds.Contains(a.ClassWorkspaceId.Value)))
                .ToList();
        }

        var list = assignments.OrderByDescending(a => a.CreatedAt).ToList();
        return Ok(list);
    }

    // GET /api/assignments/department/{departmentId} — Returns assignments for a specific department
    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        var assignments = await _unitOfWork.Assignments.GetByDepartmentAsync(departmentId);
        return Ok(assignments.Where(a => !a.IsDeleted));
    }

    // GET /api/assignments/{id} — Returns an assignment by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }

        return Ok(assignment);
    }

    // POST /api/assignments — Creates a new coursework assignment
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAssignmentModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        // Enforce role-based access control (Lecturers, Course Reps, Administrators only)
        if (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.ClassRepresentative && dbUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        // Prevent pending or unverified lecturers from creating assignments
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
        {
            return Forbid();
        }

        // Safely resolve Department ID
        Guid? resolvedDeptId = model.DepartmentId;
        if (!resolvedDeptId.HasValue || resolvedDeptId.Value == Guid.Empty)
        {
            if (dbUser.DepartmentId.HasValue && dbUser.DepartmentId.Value != Guid.Empty)
            {
                resolvedDeptId = dbUser.DepartmentId.Value;
            }
            else
            {
                var firstDept = (await _context.Departments.QueryAsync()).FirstOrDefault();
                if (firstDept != null)
                {
                    resolvedDeptId = firstDept.Id;
                }
            }
        }

        var assignment = new Assignment
        {
            Id = Guid.NewGuid(),
            Title = model.Title,
            Description = model.Description,
            Instructions = model.Instructions,
            DueDate = model.DueDate,
            PublishedAt = model.PublishedAt,
            MaxPoints = model.MaxPoints,
            Status = AssignmentStatus.Published,
            AllowLateSubmission = model.AllowLateSubmission,
            LateSubmissionPenalty = model.LateSubmissionPenalty,
            DepartmentId = resolvedDeptId,
            CreatedByUserId = userId,
            AttachmentUrl = model.AttachmentUrl,
            AttachmentFileName = model.AttachmentFileName,
            AttachmentFileSize = model.AttachmentFileSize,
            ClassWorkspaceId = model.ClassWorkspaceId,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}"
        };

        await _unitOfWork.Assignments.AddAsync(assignment);

        // Send notifications if class workspace ID was provided
        if (model.ClassWorkspaceId.HasValue)
        {
            var classWorkspace = await _context.ClassWorkspaces.QueryFirstOrDefaultAsync(
                "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
                new object?[] { model.ClassWorkspaceId.Value });

            if (classWorkspace != null)
            {
                var students = await _context.GetEnrolledStudentsAsync(classWorkspace.Id);
                foreach (var student in students)
                {
                    var notification = new Notification
                    {
                        Id = Guid.NewGuid(),
                        Title = "New Assignment Published",
                        Message = $"Assignment '{model.Title}' ({model.MaxPoints} pts) has been uploaded for {classWorkspace.Name}.",
                        Type = NotificationType.Alert,
                        Priority = NotificationPriority.Normal,
                        IsRead = false,
                        UserId = student.Id,
                        ClassWorkspaceId = classWorkspace.Id,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.Notifications.AddAsync(notification);
                }
            }
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = assignment.Id }, assignment);
    }

    // PUT /api/assignments/{id} — Updates assignment details
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAssignmentModel model)
    {
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }

        assignment.Title = model.Title;
        assignment.Description = model.Description;
        assignment.Instructions = model.Instructions;
        assignment.DueDate = model.DueDate;
        assignment.MaxPoints = model.MaxPoints;
        assignment.AllowLateSubmission = model.AllowLateSubmission;
        assignment.LateSubmissionPenalty = model.LateSubmissionPenalty;
        assignment.AttachmentUrl = model.AttachmentUrl;
        assignment.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Assignments.UpdateAsync(assignment);
        await _unitOfWork.SaveChangesAsync();

        return Ok(assignment);
    }

    // DELETE /api/assignments/{id} — Soft-deletes a coursework assignment
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }

        assignment.IsDeleted = true;
        assignment.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.Assignments.UpdateAsync(assignment);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "Assignment deleted successfully" });
    }

    // POST /api/assignments/{id}/submit — Submits coursework response for an assignment
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(Guid id, [FromBody] SubmitAssignmentModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }

        // Check if student has already submitted a response for this assignment
        var existingSubmission = await _unitOfWork.AssignmentSubmissions.GetByAssignmentAndStudentAsync(id, userId);
        if (existingSubmission != null)
        {
            return BadRequest(new { Message = "Assignment already submitted" });
        }

        var isLate = DateTime.UtcNow > assignment.DueDate;

        var submission = new AssignmentSubmission
        {
            Id = Guid.NewGuid(),
            AssignmentId = id,
            StudentId = userId,
            SubmittedAt = DateTime.UtcNow,
            Content = model.Content,
            AttachmentUrl = model.AttachmentUrl,
            IsLateSubmission = isLate,
            Status = AssignmentStatus.Submitted,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.AssignmentSubmissions.AddAsync(submission);
        await _unitOfWork.SaveChangesAsync();

        return Ok(submission);
    }

    // GET /api/assignments/{id}/submissions — Returns student submissions for a specific assignment
    [HttpGet("{id}/submissions")]
    public async Task<IActionResult> GetSubmissions(Guid id)
    {
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }

        var submissions = await _unitOfWork.AssignmentSubmissions.GetByAssignmentAsync(id);
        return Ok(submissions.Where(s => !s.IsDeleted));
    }
}

public class CreateAssignmentModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int MaxPoints { get; set; }
    public bool AllowLateSubmission { get; set; }
    public int? LateSubmissionPenalty { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? AttachmentFileName { get; set; }
    public long? AttachmentFileSize { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
}

public class UpdateAssignmentModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public int MaxPoints { get; set; }
    public bool AllowLateSubmission { get; set; }
    public int? LateSubmissionPenalty { get; set; }
    public string? AttachmentUrl { get; set; }
}

public class SubmitAssignmentModel
{
    public string? Content { get; set; }
    public string? AttachmentUrl { get; set; }
}
