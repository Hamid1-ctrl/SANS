// Import ASP.NET Core authorization namespace for securing API endpoints
using Microsoft.AspNetCore.Authorization;
// Import ASP.NET Core MVC framework namespace for API controller attributes and action results
using Microsoft.AspNetCore.Mvc;
// Import System Security Claims namespace to extract user identity claims
using System.Security.Claims;
// Import SANS application interfaces namespace for UnitOfWork access
using SANS.Application.Interfaces;
// Import SANS domain entities namespace for database entity models
using SANS.Domain.Entities;
// Import SANS domain enums namespace for user roles and account statuses
using SANS.Domain.Enums;
// Import Entity Framework Core namespace for async querying
using Microsoft.EntityFrameworkCore;

// Define namespace for SANS Web API controllers
namespace SANS.WebAPI.Controllers;

// Attribute indicating that this class is an API Controller
[ApiController]
// Set routing path to /api/assignments
[Route("api/[controller]")]
// Require JWT authentication by default for all endpoints
[Authorize]
// AssignmentsController handles coursework creation, submissions, and retrievals
public class AssignmentsController : ControllerBase
{
    // Private read-only UnitOfWork interface instance
    private readonly IUnitOfWork _unitOfWork;
    // Private read-only database context instance
    private readonly SANS.Infrastructure.Data.AppDbContext _context;

    // Constructor injecting UnitOfWork and AppDbContext
    public AssignmentsController(IUnitOfWork unitOfWork, SANS.Infrastructure.Data.AppDbContext context)
    {
        // Assign injected unit of work
        _unitOfWork = unitOfWork;
        // Assign injected database context
        _context = context;
    }

    // GET /api/assignments — Returns coursework assignments accessible to the current user
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        // Extract user ID claim from security principal
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        // Return 401 Unauthorized if user claim is missing or invalid
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            // Return 401 Unauthorized
            return Unauthorized();
        }

        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 404 Not Found if user record does not exist
        if (dbUser == null) return NotFound();

        // Capture current UTC timestamp for inline assignment expiration cleanup
        var now = DateTime.UtcNow;
        // Query active non-deleted assignments whose due date has passed
        var expiredAssignments = await _context.Assignments.Where(a => !a.IsDeleted && a.DueDate < now).ToListAsync();
        // Check if expired assignments exist
        if (expiredAssignments.Count > 0)
        {
            // Iterate through expired assignments to apply soft-deletion
            foreach (var assign in expiredAssignments)
            {
                // Set soft-deletion flag to true
                assign.IsDeleted = true;
                // Set soft-deletion timestamp
                assign.DeletedAt = now;
                // Record update author
                assign.UpdatedBy = "Auto Expired Cleanup";
            }
            // Save inline expiration updates to database
            await _context.SaveChangesAsync();
        }

        // Base query for active non-deleted assignments
        IQueryable<Assignment> query = _context.Assignments.Where(a => !a.IsDeleted);

        // Check if a specific class workspace ID was passed in request query
        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            // Filter assignments matching target class workspace OR global assignments
            query = query.Where(a => a.ClassWorkspaceId == classId.Value || a.ClassWorkspaceId == null);
        }
        else
        {
            // Fetch accessible class workspace IDs for current user (lecturer, student, 1st/2nd Rep, creator)
            var userClassIds = await _context.ClassWorkspaces
                // Filter active classes where user is enrolled, primary lecturer, 1st/2nd Rep, or creator
                .Where(c => !c.IsDeleted && (c.Students.Any(s => s.Id == userId) || c.LecturerId == userId || c.ClassRepresentativeId == userId || c.SecondClassRepresentativeId == userId || c.CreatedByUserId == userId))
                // Select class workspace IDs
                .Select(c => c.Id)
                // Execute list query asynchronously
                .ToListAsync();

            // Return global assignments OR assignments belonging to any accessible class workspace
            query = query.Where(a => a.ClassWorkspaceId == null || (a.ClassWorkspaceId != null && userClassIds.Contains(a.ClassWorkspaceId.Value)));
        }

        // Execute list query ordered by creation date descending
        var list = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();
        // Return 200 OK with list of assignments
        return Ok(list);
    }

    // GET /api/assignments/department/{departmentId} — Returns assignments for a specific department
    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        // Query assignments by department ID using repository
        var assignments = await _unitOfWork.Assignments.GetByDepartmentAsync(departmentId);
        // Return 200 OK with non-deleted assignments
        return Ok(assignments.Where(a => !a.IsDeleted));
    }

    // GET /api/assignments/{id} — Returns an assignment by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        // Query assignment by ID using unit of work repository
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        // Return 404 Not Found if assignment does not exist or is soft-deleted
        if (assignment == null || assignment.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Assignment not found" });
        }

        // Return 200 OK with assignment details
        return Ok(assignment);
    }

    // POST /api/assignments — Creates a new coursework assignment
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAssignmentModel model)
    {
        // Extract user ID claim from security principal
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        // Return 401 Unauthorized if user claim is missing or invalid
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            // Return 401 Unauthorized
            return Unauthorized();
        }

        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 404 Not Found if user record does not exist
        if (dbUser == null) return NotFound();

        // Enforce role-based access control (Lecturers, Course Reps, Administrators only)
        if (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.ClassRepresentative && dbUser.Role != UserRole.Administrator)
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Prevent pending or unverified lecturers from creating assignments
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Safely resolve Department ID
        Guid? resolvedDeptId = model.DepartmentId;
        // Check if model department ID is empty
        if (!resolvedDeptId.HasValue || resolvedDeptId.Value == Guid.Empty)
        {
            // Use user's assigned department ID if available
            if (dbUser.DepartmentId.HasValue && dbUser.DepartmentId.Value != Guid.Empty)
            {
                // Set resolved department ID to user's department ID
                resolvedDeptId = dbUser.DepartmentId.Value;
            }
            else
            {
                // Query first active department from database as fallback
                var firstDept = await _context.Departments.FirstOrDefaultAsync();
                // If department exists, set resolved department ID
                if (firstDept != null)
                {
                    // Assign first department ID
                    resolvedDeptId = firstDept.Id;
                }
            }
        }

        // Instantiate new Assignment entity
        var assignment = new Assignment
        {
            // Unique GUID ID
            Id = Guid.NewGuid(),
            // Title
            Title = model.Title,
            // Description text
            Description = model.Description,
            // Instructions text
            Instructions = model.Instructions,
            // Due date
            DueDate = model.DueDate,
            // Publication date
            PublishedAt = model.PublishedAt,
            // Maximum points
            MaxPoints = model.MaxPoints,
            // Status published
            Status = AssignmentStatus.Published,
            // Allow late submission flag
            AllowLateSubmission = model.AllowLateSubmission,
            // Late submission penalty percentage
            LateSubmissionPenalty = model.LateSubmissionPenalty,
            // Department ID
            DepartmentId = resolvedDeptId,
            // Creator user GUID ID
            CreatedByUserId = userId,
            // Attachment storage URL
            AttachmentUrl = model.AttachmentUrl,
            // Attachment file name
            AttachmentFileName = model.AttachmentFileName,
            // Attachment file size in bytes
            AttachmentFileSize = model.AttachmentFileSize,
            // Associated class workspace GUID ID
            ClassWorkspaceId = model.ClassWorkspaceId,
            // Creation timestamp in UTC
            CreatedAt = DateTime.UtcNow,
            // Creator full name string
            CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}"
        };

        // Add assignment entity to repository
        await _unitOfWork.Assignments.AddAsync(assignment);

        // Send notifications if class workspace ID was provided
        if (model.ClassWorkspaceId.HasValue)
        {
            // Query target class workspace with enrolled students
            var classWorkspace = await _context.ClassWorkspaces
                // Include enrolled students
                .Include(c => c.Students)
                // Find matching active class workspace
                .FirstOrDefaultAsync(c => c.Id == model.ClassWorkspaceId.Value && !c.IsDeleted);

            // Check if class workspace exists
            if (classWorkspace != null)
            {
                // Iterate through enrolled students to create notification records
                foreach (var student in classWorkspace.Students)
                {
                    // Instantiate new notification record
                    var notification = new Notification
                    {
                        // Unique GUID
                        Id = Guid.NewGuid(),
                        // Notification title
                        Title = "New Assignment Published",
                        // Notification message text
                        Message = $"Assignment '{model.Title}' ({model.MaxPoints} pts) has been uploaded for {classWorkspace.Name}.",
                        // Alert notification type
                        Type = NotificationType.Alert,
                        // Normal priority
                        Priority = NotificationPriority.Normal,
                        // Initial unread status
                        IsRead = false,
                        // Target recipient student ID
                        UserId = student.Id,
                        // Workspace context ID
                        ClassWorkspaceId = classWorkspace.Id,
                        // Creation timestamp
                        CreatedAt = DateTime.UtcNow
                    };
                    // Add notification to database context
                    await _context.Notifications.AddAsync(notification);
                }
            }
        }

        // Save assignment and notification changes to database
        await _context.SaveChangesAsync();

        // Return 201 CreatedAtAction response
        return CreatedAtAction(nameof(GetById), new { id = assignment.Id }, assignment);
    }

    // PUT /api/assignments/{id} — Updates assignment details
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAssignmentModel model)
    {
        // Query assignment entity by ID using repository
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        // Return 404 Not Found if assignment does not exist or is soft-deleted
        if (assignment == null || assignment.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Assignment not found" });
        }

        // Update title property
        assignment.Title = model.Title;
        // Update description property
        assignment.Description = model.Description;
        // Update instructions property
        assignment.Instructions = model.Instructions;
        // Update due date property
        assignment.DueDate = model.DueDate;
        // Update maximum points property
        assignment.MaxPoints = model.MaxPoints;
        // Update allow late submission property
        assignment.AllowLateSubmission = model.AllowLateSubmission;
        // Update late submission penalty property
        assignment.LateSubmissionPenalty = model.LateSubmissionPenalty;
        // Update attachment URL property
        assignment.AttachmentUrl = model.AttachmentUrl;
        // Update modification timestamp
        assignment.UpdatedAt = DateTime.UtcNow;

        // Update assignment in repository
        await _unitOfWork.Assignments.UpdateAsync(assignment);
        // Save database changes
        await _unitOfWork.SaveChangesAsync();

        // Return 200 OK with updated assignment
        return Ok(assignment);
    }

    // DELETE /api/assignments/{id} — Soft-deletes a coursework assignment
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        // Query assignment by ID using repository
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        // Return 404 Not Found if assignment does not exist or is soft-deleted
        if (assignment == null || assignment.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Assignment not found" });
        }

        // Set soft-deletion flag to true
        assignment.IsDeleted = true;
        // Set deletion timestamp to UTC now
        assignment.DeletedAt = DateTime.UtcNow;

        // Update assignment in repository
        await _unitOfWork.Assignments.UpdateAsync(assignment);
        // Save database changes
        await _unitOfWork.SaveChangesAsync();

        // Return 200 OK success message
        return Ok(new { Message = "Assignment deleted successfully" });
    }

    // POST /api/assignments/{id}/submit — Submits coursework response for an assignment
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(Guid id, [FromBody] SubmitAssignmentModel model)
    {
        // Extract user ID claim from security principal
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        // Return 401 Unauthorized if user claim is missing or invalid
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            // Return 401 Unauthorized
            return Unauthorized();
        }

        // Query target assignment by ID
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        // Return 404 Not Found if assignment does not exist or is soft-deleted
        if (assignment == null || assignment.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Assignment not found" });
        }

        // Check if student has already submitted a response for this assignment
        var existingSubmission = await _unitOfWork.AssignmentSubmissions.GetByAssignmentAndStudentAsync(id, userId);
        // Return 400 Bad Request if already submitted
        if (existingSubmission != null)
        {
            // Return 400 Bad Request
            return BadRequest(new { Message = "Assignment already submitted" });
        }

        // Determine if submission timestamp is past the assignment due date
        var isLate = DateTime.UtcNow > assignment.DueDate;

        // Instantiate new AssignmentSubmission entity
        var submission = new AssignmentSubmission
        {
            // Unique GUID ID
            Id = Guid.NewGuid(),
            // Associated assignment GUID ID
            AssignmentId = id,
            // Submitting student user GUID ID
            StudentId = userId,
            // Submission timestamp in UTC
            SubmittedAt = DateTime.UtcNow,
            // Submission text content
            Content = model.Content,
            // Submission attachment storage URL
            AttachmentUrl = model.AttachmentUrl,
            // Boolean late submission flag
            IsLateSubmission = isLate,
            // Status submitted
            Status = AssignmentStatus.Submitted,
            // Creation timestamp in UTC
            CreatedAt = DateTime.UtcNow
        };

        // Add submission entity to repository
        await _unitOfWork.AssignmentSubmissions.AddAsync(submission);
        // Save database changes
        await _unitOfWork.SaveChangesAsync();

        // Return 200 OK with submission details
        return Ok(submission);
    }

    // GET /api/assignments/{id}/submissions — Returns student submissions for a specific assignment
    [HttpGet("{id}/submissions")]
    public async Task<IActionResult> GetSubmissions(Guid id)
    {
        // Query assignment entity by ID
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        // Return 404 Not Found if assignment does not exist or is soft-deleted
        if (assignment == null || assignment.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Assignment not found" });
        }

        // Query submissions by assignment ID using repository
        var submissions = await _unitOfWork.AssignmentSubmissions.GetByAssignmentAsync(id);
        // Return 200 OK with active non-deleted submissions
        return Ok(submissions.Where(s => !s.IsDeleted));
    }
}

// Request Models for Assignment Operations

// Model representing assignment creation request body
public class CreateAssignmentModel
{
    // Title property
    public string Title { get; set; } = string.Empty;
    // Description text property
    public string Description { get; set; } = string.Empty;
    // Instructions text property
    public string Instructions { get; set; } = string.Empty;
    // Due date property
    public DateTime DueDate { get; set; }
    // Publication date property
    public DateTime? PublishedAt { get; set; }
    // Maximum points property
    public int MaxPoints { get; set; }
    // Allow late submission flag property
    public bool AllowLateSubmission { get; set; }
    // Late submission penalty percentage property
    public int? LateSubmissionPenalty { get; set; }
    // Department GUID ID property
    public Guid? DepartmentId { get; set; }
    // Attachment storage URL property
    public string? AttachmentUrl { get; set; }
    // Attachment file name property
    public string? AttachmentFileName { get; set; }
    // Attachment file size in bytes property
    public long? AttachmentFileSize { get; set; }
    // Class workspace GUID ID property
    public Guid? ClassWorkspaceId { get; set; }
}

// Model representing assignment update request body
public class UpdateAssignmentModel
{
    // Title property
    public string Title { get; set; } = string.Empty;
    // Description text property
    public string Description { get; set; } = string.Empty;
    // Instructions text property
    public string Instructions { get; set; } = string.Empty;
    // Due date property
    public DateTime DueDate { get; set; }
    // Maximum points property
    public int MaxPoints { get; set; }
    // Allow late submission flag property
    public bool AllowLateSubmission { get; set; }
    // Late submission penalty percentage property
    public int? LateSubmissionPenalty { get; set; }
    // Attachment storage URL property
    public string? AttachmentUrl { get; set; }
}

// Model representing assignment submission request body
public class SubmitAssignmentModel
{
    // Submission text content property
    public string? Content { get; set; }
    // Submission attachment storage URL property
    public string? AttachmentUrl { get; set; }
}
