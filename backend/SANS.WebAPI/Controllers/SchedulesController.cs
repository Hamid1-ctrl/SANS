using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SchedulesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly AppDbContext _context;

    public SchedulesController(IUnitOfWork unitOfWork, AppDbContext context)
    {
        _unitOfWork = unitOfWork;
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        var query = _context.Schedules.Where(s => !s.IsDeleted);

        if (classId.HasValue)
        {
            query = query.Where(s => s.ClassWorkspaceId == classId.Value);
        }
        else
        {
            if (dbUser.Role == UserRole.Lecturer)
            {
                query = query.Where(s => s.ClassWorkspace != null && s.ClassWorkspace.LecturerId == userId);
            }
            else
            {
                query = query.Where(s => s.ClassWorkspace != null && s.ClassWorkspace.Students.Any(stu => stu.Id == userId));
            }
        }

        var list = await query.ToListAsync();
        return Ok(list);
    }

    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendarEvents([FromQuery] Guid? classId)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        // 1. Fetch Schedules (Timetable)
        var schedulesQuery = _context.Schedules.Where(s => !s.IsDeleted);
        if (classId.HasValue)
        {
            schedulesQuery = schedulesQuery.Where(s => s.ClassWorkspaceId == classId.Value);
        }
        var schedules = await schedulesQuery.ToListAsync();

        // 2. Fetch Assignments
        var assignmentsQuery = _context.Assignments.Where(a => !a.IsDeleted);
        if (classId.HasValue)
        {
            assignmentsQuery = assignmentsQuery.Where(a => a.ClassWorkspaceId == classId.Value);
        }
        var assignments = await assignmentsQuery.ToListAsync();

        // 3. Fetch Exams
        var examsQuery = _context.Exams.Where(e => !e.IsDeleted);
        if (classId.HasValue)
        {
            examsQuery = examsQuery.Where(e => e.DepartmentId == Guid.Empty); // Placeholder or map in future if needed
        }
        var exams = await examsQuery.ToListAsync();

        var events = new List<object>();

        foreach (var s in schedules)
        {
            events.Add(new
            {
                s.Id,
                s.Title,
                s.Description,
                Start = s.StartTime,
                End = s.EndTime,
                Location = $"{s.Location} - {s.Room}",
                Type = "Timetable",
                Color = "#1e7a34"
            });
        }

        foreach (var a in assignments)
        {
            events.Add(new
            {
                a.Id,
                Title = $"Assignment Due: {a.Title}",
                Description = a.Description,
                Start = a.DueDate,
                End = a.DueDate.AddHours(1),
                Location = "Online Submission",
                Type = "Assignment",
                Color = "#3b2b52"
            });
        }

        foreach (var e in exams)
        {
            events.Add(new
            {
                e.Id,
                Title = $"Exam: {e.Title}",
                Description = "Final term exam",
                Start = e.StartTime,
                End = e.EndTime,
                Location = $"{e.Location} - {e.Room}",
                Type = "Exam",
                Color = "#dc2626"
            });
        }

        return Ok(events);
    }

    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        var schedules = await _unitOfWork.Schedules.GetByDepartmentAsync(departmentId);
        return Ok(schedules.Where(s => !s.IsDeleted));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var schedule = await _unitOfWork.Schedules.GetByIdAsync(id);
        if (schedule == null || schedule.IsDeleted)
        {
            return NotFound(new { Message = "Schedule not found" });
        }
        return Ok(schedule);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateScheduleModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var schedule = new Schedule
        {
            Id = Guid.NewGuid(),
            Title = model.Title,
            Description = model.Description,
            StartTime = model.StartTime,
            EndTime = model.EndTime,
            Location = model.Location,
            Room = model.Room,
            DepartmentId = model.DepartmentId,
            IsRecurring = model.IsRecurring,
            RecurrencePattern = model.RecurrencePattern,
            InstructorId = model.InstructorId,
            ClassWorkspaceId = model.ClassWorkspaceId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Schedules.AddAsync(schedule);

        if (model.ClassWorkspaceId.HasValue)
        {
            var classWorkspace = await _context.ClassWorkspaces
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == model.ClassWorkspaceId.Value && !c.IsDeleted);

            if (classWorkspace != null)
            {
                foreach (var student in classWorkspace.Students)
                {
                    var notification = new Notification
                    {
                        Id = Guid.NewGuid(),
                        Title = "New Class Session Scheduled",
                        Message = $"Session '{model.Title}' has been scheduled for {classWorkspace.Name}.",
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

        return CreatedAtAction(nameof(GetById), new { id = schedule.Id }, schedule);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateScheduleModel model)
    {
        var schedule = await _unitOfWork.Schedules.GetByIdAsync(id);
        if (schedule == null || schedule.IsDeleted)
        {
            return NotFound(new { Message = "Schedule not found" });
        }

        schedule.Title = model.Title;
        schedule.Description = model.Description;
        schedule.StartTime = model.StartTime;
        schedule.EndTime = model.EndTime;
        schedule.Location = model.Location;
        schedule.Room = model.Room;
        schedule.IsRecurring = model.IsRecurring;
        schedule.RecurrencePattern = model.RecurrencePattern;
        schedule.InstructorId = model.InstructorId;
        schedule.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Schedules.UpdateAsync(schedule);
        await _unitOfWork.SaveChangesAsync();

        return Ok(schedule);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var schedule = await _unitOfWork.Schedules.GetByIdAsync(id);
        if (schedule == null || schedule.IsDeleted)
        {
            return NotFound(new { Message = "Schedule not found" });
        }

        schedule.IsDeleted = true;
        schedule.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.Schedules.UpdateAsync(schedule);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "Schedule deleted successfully" });
    }
}

public class CreateScheduleModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public Guid DepartmentId { get; set; }
    public bool IsRecurring { get; set; }
    public string? RecurrencePattern { get; set; }
    public Guid? InstructorId { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
}

public class UpdateScheduleModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public bool IsRecurring { get; set; }
    public string? RecurrencePattern { get; set; }
    public Guid? InstructorId { get; set; }
}
