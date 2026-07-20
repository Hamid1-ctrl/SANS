using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuizzesController : ControllerBase
{
    private readonly AppDbContext _context;

    public QuizzesController(AppDbContext context)
    {
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

        var query = _context.Quizzes.Where(q => !q.IsDeleted);

        if (classId.HasValue)
        {
            query = query.Where(q => q.ClassWorkspaceId == classId.Value);
        }
        else
        {
            // Return global quizzes (scheduled for University Hub)
            query = query.Where(q => q.ClassWorkspaceId == Guid.Empty);
        }

        var list = await query
            .OrderByDescending(q => q.Date)
            .Select(q => new
            {
                q.Id,
                q.Title,
                q.Course,
                q.Date,
                q.Points,
                q.QuestionsCount,
                q.ClassWorkspaceId
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var quiz = await _context.Quizzes.FirstOrDefaultAsync(q => q.Id == id && !q.IsDeleted);
        if (quiz == null) return NotFound(new { Message = "Quiz not found" });

        return Ok(quiz);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateQuizModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.Administrator))
        {
            return Forbid();
        }

        // Prevent pending/suspended lecturers from scheduling quizzes
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
        {
            return Forbid();
        }

        if (model.ClassWorkspaceId == Guid.Empty)
        {
            var globalQuiz = new Quiz
            {
                Id = Guid.NewGuid(),
                Title = model.Title,
                Course = "University Hub Assessment",
                Date = model.Date,
                Points = model.Points,
                QuestionsCount = model.QuestionsCount,
                ClassWorkspaceId = Guid.Empty,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}",
                IsDeleted = false
            };

            await _context.Quizzes.AddAsync(globalQuiz);
            await _context.SaveChangesAsync();

            return Ok(globalQuiz);
        }

        var classWorkspace = await _context.ClassWorkspaces
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == model.ClassWorkspaceId && !c.IsDeleted);

        if (classWorkspace == null)
        {
            return NotFound(new { Message = "Class workspace not found" });
        }

        // Verify lecturer owns/teaches the class workspace
        if (classWorkspace.LecturerId != userId && dbUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = model.Title,
            Course = classWorkspace.Name, // Bind Course label to class name
            Date = model.Date,
            Points = model.Points,
            QuestionsCount = model.QuestionsCount,
            ClassWorkspaceId = model.ClassWorkspaceId,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}",
            IsDeleted = false
        };

        await _context.Quizzes.AddAsync(quiz);

        // --- AUTOMATED NOTIFICATIONS SYSTEM ---
        // Notify all enrolled students and course reps in that class
        foreach (var student in classWorkspace.Students)
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                Title = "New Quiz Scheduled",
                Message = $"A new quiz '{model.Title}' ({model.Points} pts) has been scheduled for {classWorkspace.Name}.",
                Type = NotificationType.Alert,
                Priority = NotificationPriority.High,
                IsRead = false,
                UserId = student.Id,
                ClassWorkspaceId = classWorkspace.Id,
                CreatedAt = DateTime.UtcNow
            };
            await _context.Notifications.AddAsync(notification);
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = quiz.Id }, quiz);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || dbUser.Role != UserRole.Lecturer) return Forbid();

        var quiz = await _context.Quizzes.FindAsync(id);
        if (quiz == null || quiz.IsDeleted) return NotFound(new { Message = "Quiz not found" });

        quiz.IsDeleted = true;
        quiz.DeletedAt = DateTime.UtcNow;
        quiz.UpdatedBy = $"{dbUser.FirstName} {dbUser.LastName}";

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Quiz deleted successfully" });
    }
}

public class CreateQuizModel
{
    public string Title { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public int Points { get; set; }
    public int QuestionsCount { get; set; }
    public Guid ClassWorkspaceId { get; set; }
}
