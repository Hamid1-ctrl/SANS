using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;
using System.Security.Claims;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClassWorkspacesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ClassWorkspacesController(AppDbContext context)
    {
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/classworkspaces — Returns classes for the current user
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetMyClasses()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        List<ClassWorkspace> classes;

        if (dbUser.Role == UserRole.Lecturer)
        {
            // Lecturers see classes where they are the assigned lecturer
            classes = await _context.ClassWorkspaces
                .Include(c => c.Lecturer)
                .Where(c => c.LecturerId == userId && !c.IsDeleted)
                .ToListAsync();
        }
        else
        {
            // Students and Reps see classes they are enrolled in
            classes = await _context.ClassWorkspaces
                .Include(c => c.Lecturer)
                .Where(c => c.Students.Any(s => s.Id == userId) && !c.IsDeleted)
                .ToListAsync();
        }

        var result = classes.Select(c => new
        {
            c.Id,
            c.Name,
            c.Code,
            c.Description,
            c.CourseCode,
            c.DepartmentText,
            c.AcademicLevel,
            c.Semester,
            ClassRepresentativeId = c.ClassRepresentativeId,
            LecturerId = c.LecturerId,
            LecturerName = c.Lecturer != null ? $"{c.Lecturer.FirstName} {c.Lecturer.LastName}" : "Unassigned",
            HasLecturer = c.LecturerId.HasValue,
            StudentsCount = _context.Entry(c).Collection(x => x.Students).Query().Count(),
            CreatedByUserId = c.CreatedByUserId
        });

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/classworkspaces/available — Classes with no lecturer (for Lecturers)
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableClasses()
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || dbUser.Role != UserRole.Lecturer)
            return Forbid();

        var classes = await _context.ClassWorkspaces
            .Where(c => c.LecturerId == null && !c.IsDeleted)
            .ToListAsync();

        // Get creator info
        var creatorIds = classes.Where(c => c.CreatedByUserId.HasValue)
            .Select(c => c.CreatedByUserId!.Value).Distinct().ToList();
        var creators = await _context.Users
            .Where(u => creatorIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}");

        var result = classes.Select(c => new
        {
            c.Id,
            c.Name,
            c.Code,
            c.Description,
            c.CourseCode,
            c.DepartmentText,
            c.AcademicLevel,
            c.Semester,
            CreatedBy = c.CreatedByUserId.HasValue && creators.ContainsKey(c.CreatedByUserId.Value)
                ? creators[c.CreatedByUserId.Value] : "Unknown",
            StudentsCount = _context.Entry(c).Collection(x => x.Students).Query().Count()
        });

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/classworkspaces/{id}/members
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetClassMembers(Guid id)
    {
        var classWorkspace = await _context.ClassWorkspaces
            .Include(c => c.Lecturer)
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

        if (classWorkspace == null) return NotFound(new { Message = "Class workspace not found" });

        var members = new
        {
            Lecturer = classWorkspace.Lecturer != null
                ? new { classWorkspace.Lecturer.Id, Name = $"{classWorkspace.Lecturer.FirstName} {classWorkspace.Lecturer.LastName}", classWorkspace.Lecturer.Email }
                : null,
            Students = classWorkspace.Students.Select(s => new { 
                s.Id, 
                Name = $"{s.FirstName} {s.LastName}", 
                s.Email, 
                s.StudentId,
                IsClassRepresentative = classWorkspace.ClassRepresentativeId == s.Id
            })
        };

        return Ok(members);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/classworkspaces — Lecturers OR Class Reps create a class
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);

        if (dbUser == null)
            return NotFound();

        if (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.ClassRepresentative)
            return Forbid();

        var normalizedCode = model.Code.Trim().ToUpper();
        if (await _context.ClassWorkspaces.AnyAsync(c => c.Code == normalizedCode && !c.IsDeleted))
            return BadRequest(new { Message = "A class with this code already exists" });

        var newClass = new ClassWorkspace
        {
            Id = Guid.NewGuid(),
            Name = model.Name,
            Code = normalizedCode,
            Description = model.Description ?? string.Empty,
            CourseCode = model.CourseCode,
            DepartmentText = model.Department,
            AcademicLevel = model.AcademicLevel,
            Semester = model.Semester,
            CreatedByUserId = userId,
            // Lecturers are immediately assigned; Reps leave lecturer slot open
            LecturerId = dbUser.Role == UserRole.Lecturer ? userId : null,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _context.ClassWorkspaces.AddAsync(newClass);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetClassMembers), new { id = newClass.Id }, new
        {
            newClass.Id,
            newClass.Name,
            newClass.Code,
            newClass.Description,
            newClass.CourseCode,
            newClass.DepartmentText,
            newClass.AcademicLevel,
            newClass.Semester,
            LecturerName = dbUser.Role == UserRole.Lecturer ? $"{dbUser.FirstName} {dbUser.LastName}" : "Unassigned",
            HasLecturer = dbUser.Role == UserRole.Lecturer
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/classworkspaces/{id}/claim — Lecturer claims an unassigned class
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("{id}/claim")]
    public async Task<IActionResult> ClaimClass(Guid id)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || dbUser.Role != UserRole.Lecturer)
            return Forbid();

        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);
        if (classWorkspace == null || classWorkspace.IsDeleted)
            return NotFound(new { Message = "Class not found" });

        if (classWorkspace.LecturerId.HasValue)
            return BadRequest(new { Message = "This class already has a lecturer assigned" });

        classWorkspace.LecturerId = userId;
        classWorkspace.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Notify students enrolled in this class
        var enrolledStudents = await _context.ClassWorkspaces
            .Include(c => c.Students)
            .Where(c => c.Id == id)
            .SelectMany(c => c.Students)
            .ToListAsync();

        foreach (var student in enrolledStudents)
        {
            await _context.Notifications.AddAsync(new Notification
            {
                Id = Guid.NewGuid(),
                Title = "Lecturer Assigned",
                Message = $"Dr. {dbUser.FirstName} {dbUser.LastName} has been assigned as lecturer for {classWorkspace.Name}.",
                Type = NotificationType.Alert,
                Priority = NotificationPriority.Normal,
                IsRead = false,
                UserId = student.Id,
                ClassWorkspaceId = classWorkspace.Id,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Class claimed successfully", ClassId = id, LecturerName = $"{dbUser.FirstName} {dbUser.LastName}" });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/classworkspaces/join — Students/Reps join by code
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("join")]
    public async Task<IActionResult> JoinClass([FromBody] JoinClassModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.Include(u => u.EnrolledClasses).FirstOrDefaultAsync(u => u.Id == userId);
        if (dbUser == null) return NotFound();

        var normalizedCode = model.Code.Trim().ToUpper();
        var classWorkspace = await _context.ClassWorkspaces
            .Include(c => c.Students)
            .Include(c => c.Lecturer)
            .FirstOrDefaultAsync(c => c.Code == normalizedCode && !c.IsDeleted);

        if (classWorkspace == null)
            return NotFound(new { Message = "Class with this code not found" });

        if (classWorkspace.Students.Any(s => s.Id == userId))
            return BadRequest(new { Message = "You are already enrolled in this class" });

        classWorkspace.Students.Add(dbUser);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            classWorkspace.Id,
            classWorkspace.Name,
            classWorkspace.Code,
            classWorkspace.Description,
            classWorkspace.CourseCode,
            classWorkspace.DepartmentText,
            classWorkspace.AcademicLevel,
            classWorkspace.Semester,
            LecturerName = classWorkspace.Lecturer != null
                ? $"{classWorkspace.Lecturer.FirstName} {classWorkspace.Lecturer.LastName}" : "Unassigned",
            StudentsCount = classWorkspace.Students.Count
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/classworkspaces/{id}/invite — Invite student by email
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("{id}/invite")]
    public async Task<IActionResult> InviteStudent(Guid id, [FromBody] InviteStudentModel model)
    {
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);
        if (classWorkspace == null) return NotFound();

        var targetStudent = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == model.Email.Trim().ToLower());
        if (targetStudent == null)
            return NotFound(new { Message = "Student with this email not found" });

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            Title = "Class Invitation",
            Message = $"You have been invited to join the class {classWorkspace.Name} ({classWorkspace.Code}).",
            Type = NotificationType.Alert,
            Priority = NotificationPriority.Normal,
            IsRead = false,
            UserId = targetStudent.Id,
            ClassWorkspaceId = classWorkspace.Id,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Invitation sent successfully" });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/classworkspaces/{id} — Edit class name / details
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateClass(Guid id, [FromBody] UpdateClassModel model)
    {
        var userId = GetCurrentUserId();
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);

        if (classWorkspace == null || classWorkspace.IsDeleted)
            return NotFound(new { Message = "Class workspace not found" });

        // Only the assigned lecturer or the creator can modify the class
        if (classWorkspace.LecturerId != userId && classWorkspace.CreatedByUserId != userId)
            return Forbid();

        classWorkspace.Name = model.Name;
        classWorkspace.Description = model.Description ?? string.Empty;
        classWorkspace.CourseCode = model.CourseCode;
        classWorkspace.DepartmentText = model.Department;
        classWorkspace.AcademicLevel = model.AcademicLevel;
        classWorkspace.Semester = model.Semester;
        classWorkspace.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(classWorkspace);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/classworkspaces/{id} — Delete / End class workspace
    // ─────────────────────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteClass(Guid id)
    {
        var userId = GetCurrentUserId();
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);

        if (classWorkspace == null || classWorkspace.IsDeleted)
            return NotFound(new { Message = "Class workspace not found" });

        // Only the assigned lecturer, creator, or a Lecturer/Rep can delete the class
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null)
            return Unauthorized();

        bool isAuthorized = false;
        if (classWorkspace.LecturerId == userId) isAuthorized = true;
        if (classWorkspace.CreatedByUserId == userId) isAuthorized = true;
        if (dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.ClassRepresentative) isAuthorized = true;

        if (!isAuthorized)
            return Forbid();

        classWorkspace.IsDeleted = true;
        classWorkspace.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Class workspace deleted successfully" });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/classworkspaces/{id}/assign-rep — Appoint Course Representative
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("{id}/assign-rep")]
    public async Task<IActionResult> AssignRepresentative(Guid id, [FromBody] AssignRepModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null)
            return Unauthorized();

        // Prevent pending/unverified lecturers from executing
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
            return Forbid();

        var classWorkspace = await _context.ClassWorkspaces
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

        if (classWorkspace == null)
            return NotFound(new { Message = "Class workspace not found" });

        // Lecturer of the class or Administrator only
        if (classWorkspace.LecturerId != userId && dbUser.Role != UserRole.Administrator)
            return Forbid();

        var targetStudent = await _context.Users.FirstOrDefaultAsync(u => u.Id == model.StudentId && !u.IsDeleted);
        if (targetStudent == null)
            return NotFound(new { Message = "Student not found" });

        // Verify student is enrolled in the class workspace
        if (!classWorkspace.Students.Any(s => s.Id == model.StudentId))
            return BadRequest(new { Message = "User is not enrolled in this class." });

        // Retrieve previous representative ID to handle demotion if replaced
        var oldRepId = classWorkspace.ClassRepresentativeId;

        // Assign rep
        classWorkspace.ClassRepresentativeId = model.StudentId;
        
        // Elevate global role to ClassRepresentative
        targetStudent.Role = UserRole.ClassRepresentative;

        // Revert previous rep's role if they no longer represent any other active class workspaces
        if (oldRepId.HasValue && oldRepId.Value != model.StudentId)
        {
            var oldRepIdVal = oldRepId.Value;
            var isOldRepElsewhere = await _context.ClassWorkspaces
                .AnyAsync(c => c.ClassRepresentativeId == oldRepIdVal && c.Id != id && !c.IsDeleted);
            if (!isOldRepElsewhere)
            {
                var oldRepUser = await _context.Users.FindAsync(oldRepIdVal);
                if (oldRepUser != null)
                {
                    oldRepUser.Role = UserRole.Student;
                }
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Representative assigned successfully.", RepresentativeId = model.StudentId });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/classworkspaces/{id}/remove-rep — Remove Course Representative
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("{id}/remove-rep")]
    public async Task<IActionResult> RemoveRepresentative(Guid id)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null)
            return Unauthorized();

        // Prevent pending/unverified lecturers from executing
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
            return Forbid();

        var classWorkspace = await _context.ClassWorkspaces.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
        if (classWorkspace == null)
            return NotFound(new { Message = "Class workspace not found" });

        // Lecturer of the class or Administrator only
        if (classWorkspace.LecturerId != userId && dbUser.Role != UserRole.Administrator)
            return Forbid();

        if (classWorkspace.ClassRepresentativeId == null)
            return BadRequest(new { Message = "No representative assigned to this class." });

        var repId = classWorkspace.ClassRepresentativeId.Value;
        classWorkspace.ClassRepresentativeId = null;

        // Revert role to Student if they are no longer representative of ANY OTHER active class
        var isRepElsewhere = await _context.ClassWorkspaces.AnyAsync(c => c.ClassRepresentativeId == repId && !c.IsDeleted);
        if (!isRepElsewhere)
        {
            var repUser = await _context.Users.FindAsync(repId);
            if (repUser != null)
            {
                repUser.Role = UserRole.Student;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Representative removed successfully." });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Models
// ─────────────────────────────────────────────────────────────────────────────

public class CreateClassModel
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CourseCode { get; set; }
    public string? Department { get; set; }
    public string? AcademicLevel { get; set; }
    public string? Semester { get; set; }
}

public class UpdateClassModel
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CourseCode { get; set; }
    public string? Department { get; set; }
    public string? AcademicLevel { get; set; }
    public string? Semester { get; set; }
}

public class JoinClassModel
{
    public string Code { get; set; } = string.Empty;
}

public class InviteStudentModel
{
    public string Email { get; set; } = string.Empty;
}

public class AssignRepModel
{
    public Guid StudentId { get; set; }
}
