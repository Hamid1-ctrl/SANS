// Import ASP.NET Core authorization namespace for securing API controller endpoints
using Microsoft.AspNetCore.Authorization;
// Import ASP.NET Core MVC framework namespace for API controller attributes and action results
using Microsoft.AspNetCore.Mvc;
// Import Entity Framework Core namespace for asynchronous database querying and inclusions
using Microsoft.EntityFrameworkCore;
// Import SANS domain entities namespace for database entity models
using SANS.Domain.Entities;
// Import SANS domain enums namespace for role and account status definitions
using SANS.Domain.Enums;
// Import SANS infrastructure data namespace for AppDbContext database context access
using SANS.Infrastructure.Data;
// Import System namespace for standard Guid and DateTime operations
using System;
// Import System Linq namespace for standard data query expressions
using System.Linq;
// Import System Security Claims namespace to extract user identity claims from JWT tokens
using System.Security.Claims;
// Import System Threading Tasks namespace for async Task execution
using System.Threading.Tasks;

// Define the namespace for SANS Web API controllers
namespace SANS.WebAPI.Controllers;

// Attribute marking this class as an API Controller with automated model validation
[ApiController]
// Set the routing path for this controller to /api/quizzes
[Route("api/[controller]")]
// Enforce JWT token authentication on all endpoints in this controller by default
[Authorize]
// QuizzesController handles academic quiz scheduling, retrieval, and deletion
public class QuizzesController : ControllerBase
{
    // Private read-only field holding the Entity Framework database context instance
    private readonly AppDbContext _context;

    // Constructor injecting the application database context instance
    public QuizzesController(AppDbContext context)
    {
        // Assign the injected context to the private controller field
        _context = context;
    }

    // Private helper method to extract the authenticated user's GUID ID from JWT claims
    private Guid GetCurrentUserId()
    {
        // Find the NameIdentifier claim from the current user's security principal
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        // Parse the claim string value to a Guid if present, otherwise return Guid.Empty
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    // GET /api/quizzes — Returns scheduled quizzes for the specified class or current user's enrolled classes
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Return 401 Unauthorized if user ID claim is invalid or missing
        if (userId == Guid.Empty) return Unauthorized();

        // Query database to fetch current user profile record
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 404 Not Found if user record does not exist
        if (dbUser == null) return NotFound();

        // Capture current UTC date and time for inline expiration checks
        var now = DateTime.UtcNow;
        // Query database for expired active quizzes whose scheduled date has passed
        var expired = await _context.Quizzes.Where(q => !q.IsDeleted && q.Date < now).ToListAsync();
        // Check if any expired quizzes were found
        if (expired.Count > 0)
        {
            // Iterate through expired quizzes to apply soft-deletion
            foreach (var item in expired)
            {
                // Set soft-deletion flag to true
                item.IsDeleted = true;
                // Record deletion timestamp
                item.DeletedAt = now;
                // Set audit update author string
                item.UpdatedBy = "Auto Expired Cleanup";
            }
            // Save inline cleanup updates asynchronously
            await _context.SaveChangesAsync();
        }

        // Initialize base IQueryable for active non-deleted quizzes
        var query = _context.Quizzes.Where(q => !q.IsDeleted);

        // Check if a specific class workspace ID parameter was provided in the request query
        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            // Filter quizzes matching target class workspace ID or global quizzes (Guid.Empty)
            query = query.Where(q => q.ClassWorkspaceId == classId.Value || q.ClassWorkspaceId == Guid.Empty);
        }
        else
        {
            // Fetch list of all active class workspace IDs accessible to the current user
            var userClassIds = await _context.ClassWorkspaces
                // Filter active classes where user is enrolled, primary lecturer, 1st/2nd Rep, or creator
                .Where(c => !c.IsDeleted && (c.Students.Any(s => s.Id == userId) || c.LecturerId == userId || c.ClassRepresentativeId == userId || c.SecondClassRepresentativeId == userId || c.CreatedByUserId == userId))
                // Select class workspace IDs
                .Select(c => c.Id)
                // Execute list query asynchronously
                .ToListAsync();

            // Filter quizzes that are global (Guid.Empty) or belong to any class workspace accessible to the user
            query = query.Where(q => q.ClassWorkspaceId == Guid.Empty || userClassIds.Contains(q.ClassWorkspaceId));
        }

        // Execute query ordered by scheduled date descending and map to response DTO format
        var list = await query
            // Order quizzes by scheduled date in descending order
            .OrderByDescending(q => q.Date)
            // Select formatted anonymous DTO properties
            .Select(q => new
            {
                // Unique quiz GUID ID
                q.Id,
                // Quiz title
                q.Title,
                // Course label or name
                q.Course,
                // Scheduled date and time
                q.Date,
                // Quiz total points
                q.Points,
                // Total questions count
                q.QuestionsCount,
                // Associated class workspace GUID ID
                q.ClassWorkspaceId
            })
            // Execute list query asynchronously
            .ToListAsync();

        // Return 200 OK with list of scheduled quizzes
        return Ok(list);
    }

    // GET /api/quizzes/{id} — Returns detailed information for a specific quiz by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        // Query database for first active matching quiz by ID
        var quiz = await _context.Quizzes.FirstOrDefaultAsync(q => q.Id == id && !q.IsDeleted);
        // Return 404 Not Found if quiz record does not exist
        if (quiz == null) return NotFound(new { Message = "Quiz not found" });

        // Return 200 OK with quiz details
        return Ok(quiz);
    }

    // POST /api/quizzes — Schedules a new academic quiz for a class workspace
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateQuizModel model)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Enforce that only Lecturers or Administrators can schedule quizzes
        if (dbUser == null || (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.Administrator))
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Prevent pending or unverified lecturers from scheduling quizzes
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Check if quiz is being scheduled for the global University Hub
        if (model.ClassWorkspaceId == Guid.Empty)
        {
            // Instantiate global Quiz entity
            var globalQuiz = new Quiz
            {
                // Unique GUID ID
                Id = Guid.NewGuid(),
                // Quiz title
                Title = model.Title,
                // Course label for global assessments
                Course = "University Hub Assessment",
                // Scheduled date and time
                Date = model.Date,
                // Total points
                Points = model.Points,
                // Total questions count
                QuestionsCount = model.QuestionsCount,
                // Empty GUID denoting global scope
                ClassWorkspaceId = Guid.Empty,
                // Creation timestamp in UTC
                CreatedAt = DateTime.UtcNow,
                // Author full name string
                CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}",
                // Initial soft-deletion flag false
                IsDeleted = false
            };

            // Add global quiz entity to database set
            await _context.Quizzes.AddAsync(globalQuiz);
            // Save database changes
            await _context.SaveChangesAsync();

            // Return 200 OK with created global quiz
            return Ok(globalQuiz);
        }

        // Query target active class workspace with enrolled students included
        var classWorkspace = await _context.ClassWorkspaces
            // Include enrolled students
            .Include(c => c.Students)
            // Find first matching active workspace by ID
            .FirstOrDefaultAsync(c => c.Id == model.ClassWorkspaceId && !c.IsDeleted);

        // Return 404 Not Found if workspace does not exist
        if (classWorkspace == null)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Class workspace not found" });
        }

        // Verify that executing user is the assigned lecturer or an Administrator
        if (classWorkspace.LecturerId != userId && dbUser.Role != UserRole.Administrator)
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Instantiate new class-scoped Quiz entity
        var quiz = new Quiz
        {
            // Unique GUID ID
            Id = Guid.NewGuid(),
            // Quiz title
            Title = model.Title,
            // Set Course label to workspace name
            Course = classWorkspace.Name,
            // Scheduled date and time
            Date = model.Date,
            // Total points
            Points = model.Points,
            // Total questions count
            QuestionsCount = model.QuestionsCount,
            // Associated class workspace GUID ID
            ClassWorkspaceId = model.ClassWorkspaceId,
            // Creation timestamp in UTC
            CreatedAt = DateTime.UtcNow,
            // Author full name string
            CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}",
            // Initial soft-deletion flag false
            IsDeleted = false
        };

        // Add quiz entity to database context
        await _context.Quizzes.AddAsync(quiz);

        // Iterate through enrolled students to send scheduled quiz notifications
        foreach (var student in classWorkspace.Students)
        {
            // Instantiate new notification record
            var notification = new Notification
            {
                // Unique GUID
                Id = Guid.NewGuid(),
                // Title
                Title = "New Quiz Scheduled",
                // Message text
                Message = $"A new quiz '{model.Title}' ({model.Points} pts) has been scheduled for {classWorkspace.Name}.",
                // Alert type
                Type = NotificationType.Alert,
                // High priority
                Priority = NotificationPriority.High,
                // Initial unread status
                IsRead = false,
                // Target recipient student ID
                UserId = student.Id,
                // Workspace context ID
                ClassWorkspaceId = classWorkspace.Id,
                // Creation timestamp
                CreatedAt = DateTime.UtcNow
            };
            // Add notification record to database
            await _context.Notifications.AddAsync(notification);
        }

        // Persist quiz and notification changes to database
        await _context.SaveChangesAsync();

        // Return 201 CreatedAtAction response with created quiz
        return CreatedAtAction(nameof(GetById), new { id = quiz.Id }, quiz);
    }

    // DELETE /api/quizzes/{id} — Soft-deletes a scheduled quiz
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Enforce that only Lecturers or Admins can delete quizzes
        if (dbUser == null || (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.Administrator)) return Forbid();

        // Find target quiz record by ID
        var quiz = await _context.Quizzes.FindAsync(id);
        // Return 404 Not Found if quiz record does not exist or is soft-deleted
        if (quiz == null || quiz.IsDeleted) return NotFound(new { Message = "Quiz not found" });

        // Set soft-deletion flag to true
        quiz.IsDeleted = true;
        // Record deletion timestamp
        quiz.DeletedAt = DateTime.UtcNow;
        // Record author string
        quiz.UpdatedBy = $"{dbUser.FirstName} {dbUser.LastName}";

        // Persist database changes
        await _context.SaveChangesAsync();
        // Return 200 OK success message
        return Ok(new { Message = "Quiz deleted successfully" });
    }
}

// Request Models for Quiz Operations

// Model representing quiz creation request body
public class CreateQuizModel
{
    // Quiz title property
    public string Title { get; set; } = string.Empty;
    // Scheduled date and time property
    public DateTime Date { get; set; }
    // Total points property
    public int Points { get; set; }
    // Total questions count property
    public int QuestionsCount { get; set; }
    // Associated class workspace GUID ID property
    public Guid ClassWorkspaceId { get; set; }
}
