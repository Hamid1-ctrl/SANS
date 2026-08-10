using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Services.D1;
using System.Security.Claims;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuizzesController : ControllerBase
{
    private readonly D1Context _context;

    public QuizzesController(D1Context context)
    {
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    // GET /api/quizzes — Returns scheduled quizzes for the specified class or current user's enrolled classes
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        // Soft-delete expired quizzes inline
        var now = DateTime.UtcNow;
        var expired = (await _context.Quizzes.QueryAsync("WHERE \"IsDeleted\" = 0"))
            .Where(q => q.Date < now)
            .ToList();

        if (expired.Count > 0)
        {
            foreach (var item in expired)
            {
                item.IsDeleted = true;
                item.DeletedAt = now;
                item.UpdatedBy = "Auto Expired Cleanup";
                _context.Quizzes.Update(item);
            }
            await _context.SaveChangesAsync();
        }

        var quizzes = await _context.Quizzes.QueryAsync("WHERE \"IsDeleted\" = 0");

        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            quizzes = quizzes
                .Where(q => q.ClassWorkspaceId == classId.Value || q.ClassWorkspaceId == Guid.Empty)
                .ToList();
        }
        else
        {
            // Fetch IDs of all active classes accessible to the current user (enrolled, lecturer, rep, or creator)
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

            quizzes = quizzes
                .Where(q => q.ClassWorkspaceId == Guid.Empty || userClassIds.Contains(q.ClassWorkspaceId))
                .ToList();
        }

        var list = quizzes
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
            .ToList();

        return Ok(list);
    }

    // GET /api/quizzes/{id} — Returns detailed information for a specific quiz by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var quiz = await _context.Quizzes.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });
        if (quiz == null) return NotFound(new { Message = "Quiz not found" });

        return Ok(quiz);
    }

    // POST /api/quizzes — Schedules a new academic quiz for a class workspace
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateQuizModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.Administrator))
        {
            return Forbid();
        }

        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
        {
            return Forbid();
        }

        // Global quiz for the University Hub
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

        var classWorkspace = await _context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { model.ClassWorkspaceId });

        if (classWorkspace == null)
        {
            return NotFound(new { Message = "Class workspace not found" });
        }

        if (classWorkspace.LecturerId != userId && dbUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = model.Title,
            Course = classWorkspace.Name,
            Date = model.Date,
            Points = model.Points,
            QuestionsCount = model.QuestionsCount,
            ClassWorkspaceId = model.ClassWorkspaceId,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}",
            IsDeleted = false
        };

        await _context.Quizzes.AddAsync(quiz);

        // Notify all enrolled students about the new quiz
        var enrolledStudents = await _context.GetEnrolledStudentsAsync(classWorkspace.Id);
        foreach (var student in enrolledStudents)
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

    // DELETE /api/quizzes/{id} — Soft-deletes a scheduled quiz
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.Administrator)) return Forbid();

        var quiz = await _context.Quizzes.FindAsync(id);
        if (quiz == null || quiz.IsDeleted) return NotFound(new { Message = "Quiz not found" });

        quiz.IsDeleted = true;
        quiz.DeletedAt = DateTime.UtcNow;
        quiz.UpdatedBy = $"{dbUser.FirstName} {dbUser.LastName}";

        _context.Quizzes.Update(quiz);
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
