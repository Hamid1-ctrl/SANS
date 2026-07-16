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
            classes = await _context.ClassWorkspaces
                .Include(c => c.Lecturer)
                .Where(c => c.LecturerId == userId && !c.IsDeleted)
                .ToListAsync();
        }
        else
        {
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
            LecturerName = $"{c.Lecturer.FirstName} {c.Lecturer.LastName}",
            StudentsCount = _context.Entry(c).Collection(x => x.Students).Query().Count()
        });

        return Ok(result);
    }

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
            Lecturer = new { classWorkspace.Lecturer.Id, Name = $"{classWorkspace.Lecturer.FirstName} {classWorkspace.Lecturer.LastName}", classWorkspace.Lecturer.Email },
            Students = classWorkspace.Students.Select(s => new { s.Id, Name = $"{s.FirstName} {s.LastName}", s.Email, s.StudentId })
        };

        return Ok(members);
    }

    [HttpPost]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || dbUser.Role != UserRole.Lecturer)
        {
            return Forbid();
        }

        var normalizedCode = model.Code.Trim().ToUpper();
        if (await _context.ClassWorkspaces.AnyAsync(c => c.Code == normalizedCode && !c.IsDeleted))
        {
            return BadRequest(new { Message = "A class with this code already exists" });
        }

        var newClass = new ClassWorkspace
        {
            Id = Guid.NewGuid(),
            Name = model.Name,
            Code = normalizedCode,
            Description = model.Description,
            LecturerId = userId,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _context.ClassWorkspaces.AddAsync(newClass);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetClassMembers), new { id = newClass.Id }, newClass);
    }

    [HttpPost("join")]
    public async Task<IActionResult> JoinClass([FromBody] JoinClassModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.Include(u => u.EnrolledClasses).FirstOrDefaultAsync(u => u.Id == userId);
        if (dbUser == null) return NotFound();

        var normalizedCode = model.Code.Trim().ToUpper();
        var classWorkspace = await _context.ClassWorkspaces
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Code == normalizedCode && !c.IsDeleted);

        if (classWorkspace == null)
        {
            return NotFound(new { Message = "Class with this code not found" });
        }

        if (classWorkspace.Students.Any(s => s.Id == userId))
        {
            return BadRequest(new { Message = "You are already enrolled in this class" });
        }

        classWorkspace.Students.Add(dbUser);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            classWorkspace.Id,
            classWorkspace.Name,
            classWorkspace.Code,
            classWorkspace.Description,
            LecturerName = $"{classWorkspace.Lecturer?.FirstName} {classWorkspace.Lecturer?.LastName}",
            StudentsCount = classWorkspace.Students.Count
        });
    }

    [HttpPost("{id}/invite")]
    public async Task<IActionResult> InviteStudent(Guid id, [FromBody] InviteStudentModel model)
    {
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);
        if (classWorkspace == null) return NotFound();

        var targetStudent = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == model.Email.Trim().ToLower());
        if (targetStudent == null)
        {
            return NotFound(new { Message = "Student with this email not found" });
        }

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
}

public class CreateClassModel
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class JoinClassModel
{
    public string Code { get; set; } = string.Empty;
}

public class InviteStudentModel
{
    public string Email { get; set; } = string.Empty;
}
