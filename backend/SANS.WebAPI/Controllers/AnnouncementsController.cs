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
// Import Entity Framework Core namespace for async database queries
using Microsoft.EntityFrameworkCore;

// Define namespace for SANS Web API controllers
namespace SANS.WebAPI.Controllers;

// Attribute indicating that this class is an API Controller
[ApiController]
// Set routing path to /api/announcements
[Route("api/[controller]")]
// Require JWT authentication by default for all endpoints
[Authorize]
// AnnouncementsController handles official academic notice publishing, approvals, and retrievals
public class AnnouncementsController : ControllerBase
{
    // Private read-only UnitOfWork interface instance
    private readonly IUnitOfWork _unitOfWork;
    // Private read-only database context instance
    private readonly SANS.Infrastructure.Data.AppDbContext _context;

    // Constructor injecting UnitOfWork and AppDbContext
    public AnnouncementsController(IUnitOfWork unitOfWork, SANS.Infrastructure.Data.AppDbContext context)
    {
        // Assign injected unit of work
        _unitOfWork = unitOfWork;
        // Assign injected database context
        _context = context;
    }

    // Private helper method to extract authenticated user GUID ID from JWT claims
    private Guid GetCurrentUserId()
    {
        // Find NameIdentifier claim from current user principal
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        // Parse Guid if present, otherwise return Guid.Empty
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    // GET /api/announcements — Returns announcements accessible to the current user
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Return 401 Unauthorized if user ID claim is missing or invalid
        if (userId == Guid.Empty) return Unauthorized();

        // Query database for current user profile record
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 404 Not Found if user record does not exist
        if (dbUser == null) return NotFound();

        // Base query for active non-deleted announcements
        var query = _context.Announcements.Where(a => !a.IsDeleted);

        // Check if a specific class workspace ID parameter was passed in query string
        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            // Return announcements belonging to target class workspace OR global university notices
            query = query.Where(a => a.ClassWorkspaceId == classId.Value || a.IsGlobal || a.ClassWorkspaceId == null);
        }
        else
        {
            // Fetch list of accessible class workspace IDs for current user
            var userClassIds = await _context.ClassWorkspaces
                // Filter active classes where user is enrolled, primary lecturer, 1st/2nd Rep, or creator
                .Where(c => !c.IsDeleted && (c.Students.Any(s => s.Id == userId) || c.LecturerId == userId || c.ClassRepresentativeId == userId || c.SecondClassRepresentativeId == userId || c.CreatedByUserId == userId))
                // Select class workspace IDs
                .Select(c => c.Id)
                // Execute list query asynchronously
                .ToListAsync();

            // Return global announcements OR announcements belonging to any accessible class workspace
            query = query.Where(a => a.IsGlobal || a.ClassWorkspaceId == null || (a.ClassWorkspaceId != null && userClassIds.Contains(a.ClassWorkspaceId.Value)));
        }

        // Execute list query ordered by pinned status, priority weight, and creation timestamp
        var list = await query
            // Order pinned announcements first
            .OrderByDescending(a => a.IsPinned)
            // Order by priority weight (Urgent=0, Important=1, General=2)
            .ThenBy(a => a.Priority == "Urgent" ? 0 : a.Priority == "Important" ? 1 : 2)
            // Order by creation timestamp descending
            .ThenByDescending(a => a.CreatedAt)
            // Execute list query asynchronously
            .ToListAsync();

        // Return 200 OK with formatted list of announcements
        return Ok(list);
    }

    // GET /api/announcements/global — Returns global university-wide announcements
    [HttpGet("global")]
    public async Task<IActionResult> GetGlobal()
    {
        // Query global announcements using unit of work repository
        var announcements = await _unitOfWork.Announcements.GetGlobalAnnouncementsAsync();
        // Return 200 OK with active non-deleted announcements
        return Ok(announcements.Where(a => !a.IsDeleted));
    }

    // GET /api/announcements/department/{departmentId} — Returns announcements for a specific department
    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        // Query department announcements using repository
        var announcements = await _unitOfWork.Announcements.GetByDepartmentAsync(departmentId);
        // Return 200 OK with active non-deleted announcements
        return Ok(announcements.Where(a => !a.IsDeleted));
    }

    // GET /api/announcements/{id} — Returns detailed announcement record by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        // Query announcement with class workspace navigation property included
        var announcement = await _context.Announcements
            // Include class workspace navigation object
            .Include(a => a.ClassWorkspace)
            // Find first matching active announcement by ID
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

        // Return 404 Not Found if announcement does not exist
        if (announcement == null)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Announcement not found" });
        }

        // Increment announcement view counter
        announcement.ViewCount++;
        // Save view count update to database
        await _context.SaveChangesAsync();

        // Return 200 OK with announcement details
        return Ok(announcement);
    }

    // POST /api/announcements — Publishes a new academic notice announcement
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementModel model)
    {
        // Extract user ID claim from security principal
        var userId = GetCurrentUserId();
        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Enforce role-based access control (Lecturers, Course Reps, Administrators only)
        if (dbUser == null || (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.ClassRepresentative && dbUser.Role != UserRole.Administrator))
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Prevent pending or unverified lecturers from publishing announcements
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Prevent Course Representatives from posting global university announcements
        if (dbUser.Role == UserRole.ClassRepresentative && model.IsGlobal)
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Determine verification status (Lecturers and Admins are auto-verified; Course Reps require lecturer approval)
        bool isVerified = false;
        // Default initial status string
        string initialStatus = "Draft";

        // Lecturers and Admins publish verified announcements directly
        if (dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.Administrator)
        {
            // Set verified flag true
            isVerified = true;
            // Set status Verified
            initialStatus = "Verified";
        }
        // Course Representatives publish announcements requiring approval
        else if (dbUser.Role == UserRole.ClassRepresentative)
        {
            // Set verified flag false
            isVerified = false;
            // Set status PendingApproval
            initialStatus = "PendingApproval";
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

        // Collect target class workspace IDs
        var targetClassIds = new List<Guid>();
        // Check if multiple class IDs array was provided
        if (model.ClassWorkspaceIds != null && model.ClassWorkspaceIds.Length > 0)
        {
            // Add all class IDs to target list
            targetClassIds.AddRange(model.ClassWorkspaceIds);
        }
        // Check if single class ID was provided
        else if (model.ClassWorkspaceId.HasValue)
        {
            // Add single class ID to target list
            targetClassIds.Add(model.ClassWorkspaceId.Value);
        }

        // Variable to reference first created announcement
        Announcement firstAnnouncement = null!;

        // Check if announcement is global
        if (model.IsGlobal || targetClassIds.Count == 0)
        {
            // Instantiate global Announcement entity
            var announcement = new Announcement
            {
                // Unique GUID ID
                Id = Guid.NewGuid(),
                // Title
                Title = model.Title,
                // Content body text
                Content = model.Content,
                // Global flag
                IsGlobal = model.IsGlobal,
                // Department ID
                DepartmentId = resolvedDeptId,
                // Target role ID
                TargetRoleId = !string.IsNullOrEmpty(model.TargetRoleId) ? Guid.Parse(model.TargetRoleId) : null,
                // Publication timestamp
                PublishedAt = model.PublishedAt ?? DateTime.UtcNow,
                // Expiration timestamp
                ExpiresAt = model.ExpiresAt,
                // Pinned flag
                IsPinned = model.IsPinned,
                // Class workspace null for global
                ClassWorkspaceId = null,
                // Verified flag
                IsVerified = isVerified,
                // Verification status string
                Status = initialStatus,
                // Search tags string
                Tags = model.Tags ?? string.Empty,
                // Priority string
                Priority = model.Priority ?? "General",
                // Category string
                Category = model.Category ?? "General",
                // Creation timestamp in UTC
                CreatedAt = DateTime.UtcNow,
                // Author full name string
                CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}"
            };

            // Add announcement entity to repository
            await _unitOfWork.Announcements.AddAsync(announcement);
            // Save database changes
            await _context.SaveChangesAsync();

            // Return 201 CreatedAtAction response
            return CreatedAtAction(nameof(GetById), new { id = announcement.Id }, announcement);
        }

        // Iterate through target class IDs to create class-scoped announcement records
        foreach (var classId in targetClassIds)
        {
            // Query target class workspace with enrolled students included
            var classWorkspace = await _context.ClassWorkspaces
                // Include enrolled students
                .Include(c => c.Students)
                // Find matching active class workspace
                .FirstOrDefaultAsync(c => c.Id == classId && !c.IsDeleted);

            // Skip iteration if class workspace does not exist
            if (classWorkspace == null) continue;

            // Security: Enforce class-scoped Course Representative checks (verify user is 1st or 2nd Rep)
            if (dbUser.Role == UserRole.ClassRepresentative && classWorkspace.ClassRepresentativeId != userId && classWorkspace.SecondClassRepresentativeId != userId)
            {
                // Return 403 Forbidden if user is not a representative for this class workspace
                return Forbid();
            }

            // Instantiate class-scoped Announcement entity
            var announcement = new Announcement
            {
                // Unique GUID ID
                Id = Guid.NewGuid(),
                // Title
                Title = model.Title,
                // Content body text
                Content = model.Content,
                // Global flag false
                IsGlobal = model.IsGlobal,
                // Department ID
                DepartmentId = resolvedDeptId,
                // Target role ID
                TargetRoleId = !string.IsNullOrEmpty(model.TargetRoleId) ? Guid.Parse(model.TargetRoleId) : null,
                // Publication timestamp
                PublishedAt = model.PublishedAt ?? DateTime.UtcNow,
                // Expiration timestamp
                ExpiresAt = model.ExpiresAt,
                // Pinned flag
                IsPinned = model.IsPinned,
                // Associated class workspace GUID ID
                ClassWorkspaceId = classId,
                // Verified flag
                IsVerified = isVerified,
                // Verification status string
                Status = initialStatus,
                // Search tags string
                Tags = model.Tags ?? string.Empty,
                // Priority string
                Priority = model.Priority ?? "General",
                // Category string
                Category = model.Category ?? "General",
                // Creation timestamp in UTC
                CreatedAt = DateTime.UtcNow,
                // Author full name string
                CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}"
            };

            // Add announcement entity to repository
            await _unitOfWork.Announcements.AddAsync(announcement);
            // Set first created announcement reference
            if (firstAnnouncement == null) firstAnnouncement = announcement;

            // Trigger notifications for enrolled students in class workspace
            if (classWorkspace != null)
            {
                // Iterate through enrolled students
                foreach (var student in classWorkspace.Students)
                {
                    // Instantiate notification record
                    var notification = new Notification
                    {
                        // Unique GUID
                        Id = Guid.NewGuid(),
                        // Notification title
                        Title = "New Announcement Published",
                        // Notification message text
                        Message = $"Notice '{model.Title}' has been posted in {classWorkspace.Name}.",
                        // Alert notification type
                        Type = NotificationType.Alert,
                        // Set priority based on announcement priority
                        Priority = model.Priority == "Urgent" ? NotificationPriority.High : NotificationPriority.Normal,
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

        // Save all created announcements and notifications to database
        await _context.SaveChangesAsync();

        // Return 201 CreatedAtAction response
        return CreatedAtAction(nameof(GetById), new { id = firstAnnouncement.Id }, firstAnnouncement);
    }

    // PUT /api/announcements/{id} — Updates announcement content
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementModel model)
    {
        // Query announcement entity by ID using repository
        var announcement = await _unitOfWork.Announcements.GetByIdAsync(id);
        // Return 404 Not Found if announcement does not exist or is soft-deleted
        if (announcement == null || announcement.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Announcement not found" });
        }

        // Update title property
        announcement.Title = model.Title;
        // Update content body property
        announcement.Content = model.Content;
        // Update global flag property
        announcement.IsGlobal = model.IsGlobal;
        // Update department ID property
        announcement.DepartmentId = model.DepartmentId;
        // Update target role ID property
        announcement.TargetRoleId = !string.IsNullOrEmpty(model.TargetRoleId) ? Guid.Parse(model.TargetRoleId) : null;
        // Update expiration timestamp property
        announcement.ExpiresAt = model.ExpiresAt;
        // Update pinned flag property
        announcement.IsPinned = model.IsPinned;
        // Update tags property
        announcement.Tags = model.Tags ?? string.Empty;
        // Update priority property
        announcement.Priority = model.Priority ?? "General";
        // Update category property
        announcement.Category = model.Category ?? "General";
        // Update modification timestamp
        announcement.UpdatedAt = DateTime.UtcNow;

        // Update announcement entity in repository
        await _unitOfWork.Announcements.UpdateAsync(announcement);
        // Save database changes
        await _unitOfWork.SaveChangesAsync();

        // Return 200 OK with updated announcement
        return Ok(announcement);
    }

    // DELETE /api/announcements/{id} — Soft-deletes an announcement
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        // Query announcement entity by ID using repository
        var announcement = await _unitOfWork.Announcements.GetByIdAsync(id);
        // Return 404 Not Found if announcement does not exist or is soft-deleted
        if (announcement == null || announcement.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Announcement not found" });
        }

        // Set soft-deletion flag to true
        announcement.IsDeleted = true;
        // Set deletion timestamp to UTC now
        announcement.DeletedAt = DateTime.UtcNow;

        // Update announcement in repository
        await _unitOfWork.Announcements.UpdateAsync(announcement);
        // Save database changes
        await _context.SaveChangesAsync();

        // Return 200 OK success message
        return Ok(new { Message = "Announcement deleted successfully" });
    }

    // POST /api/announcements/{id}/submit-approval — Submits Course Rep announcement for lecturer verification
    [HttpPost("{id}/submit-approval")]
    public async Task<IActionResult> SubmitForApproval(Guid id)
    {
        // Find target announcement by ID
        var announcement = await _context.Announcements.FindAsync(id);
        // Return 404 Not Found if announcement does not exist or is soft-deleted
        if (announcement == null || announcement.IsDeleted) return NotFound();

        // Update status to PendingApproval
        announcement.Status = "PendingApproval";
        // Save database changes
        await _context.SaveChangesAsync();

        // Return 200 OK with updated announcement
        return Ok(announcement);
    }

    // POST /api/announcements/{id}/approve — Lecturer verifies and approves Course Rep announcement
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Enforce that only Lecturers can approve announcements
        if (dbUser == null || dbUser.Role != UserRole.Lecturer) return Forbid();

        // Find target announcement by ID
        var announcement = await _context.Announcements.FindAsync(id);
        // Return 404 Not Found if announcement does not exist or is soft-deleted
        if (announcement == null || announcement.IsDeleted) return NotFound();

        // Update status to Verified
        announcement.Status = "Verified";
        // Set verified boolean flag true
        announcement.IsVerified = true;
        // Save database changes
        await _context.SaveChangesAsync();

        // Return 200 OK with approved announcement
        return Ok(announcement);
    }

    // POST /api/announcements/{id}/reject — Lecturer rejects Course Rep announcement
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Enforce that only Lecturers can reject announcements
        if (dbUser == null || dbUser.Role != UserRole.Lecturer) return Forbid();

        // Find target announcement by ID
        var announcement = await _context.Announcements.FindAsync(id);
        // Return 404 Not Found if announcement does not exist or is soft-deleted
        if (announcement == null || announcement.IsDeleted) return NotFound();

        // Update status to Rejected
        announcement.Status = "Rejected";
        // Set verified boolean flag false
        announcement.IsVerified = false;
        // Save database changes
        await _context.SaveChangesAsync();

        // Return 200 OK with rejected announcement
        return Ok(announcement);
    }

    // POST /api/announcements/{id}/engage — Logs user engagement metrics (View, Download, Bookmark)
    [HttpPost("{id}/engage")]
    public async Task<IActionResult> LogEngagement(Guid id, [FromQuery] string actionType)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Return 401 Unauthorized if user claim is missing or invalid
        if (userId == Guid.Empty) return Unauthorized();

        // Find target announcement by ID
        var announcement = await _context.Announcements.FindAsync(id);
        // Return 404 Not Found if announcement does not exist or is soft-deleted
        if (announcement == null || announcement.IsDeleted) return NotFound();

        // Instantiate new AnnouncementEngagement record
        var engagement = new AnnouncementEngagement
        {
            // Unique GUID ID
            Id = Guid.NewGuid(),
            // Associated announcement GUID ID
            AnnouncementId = id,
            // User GUID ID
            UserId = userId,
            // Action type string ("View", "Download", "Bookmark")
            ActionType = actionType,
            // Creation timestamp in UTC
            CreatedAt = DateTime.UtcNow
        };

        // Add engagement record to database context
        await _context.AnnouncementEngagements.AddAsync(engagement);
        // Save database changes
        await _context.SaveChangesAsync();

        // Return 200 OK
        return Ok();
    }

    // GET /api/announcements/{id}/analytics — Returns engagement analytics for an announcement
    [HttpGet("{id}/analytics")]
    public async Task<IActionResult> GetEngagementAnalytics(Guid id)
    {
        // Find target announcement by ID
        var announcement = await _context.Announcements.FindAsync(id);
        // Return 404 Not Found if announcement does not exist or is soft-deleted
        if (announcement == null || announcement.IsDeleted) return NotFound();

        // Count view engagement records
        var views = await _context.AnnouncementEngagements.CountAsync(e => e.AnnouncementId == id && e.ActionType == "View");
        // Count download engagement records
        var downloads = await _context.AnnouncementEngagements.CountAsync(e => e.AnnouncementId == id && e.ActionType == "Download");
        // Count bookmark engagement records
        var bookmarks = await _context.AnnouncementEngagements.CountAsync(e => e.AnnouncementId == id && e.ActionType == "Bookmark");

        // Return 200 OK with analytics counts
        return Ok(new
        {
            // Announcement ID
            AnnouncementId = id,
            // Total views count sum
            ViewsCount = views + announcement.ViewCount,
            // Total downloads count
            DownloadsCount = downloads,
            // Total bookmarks count
            BookmarksCount = bookmarks
        });
    }
}

// Request Models for Announcement Operations

// Model representing announcement creation request body
public class CreateAnnouncementModel
{
    // Title property
    public string Title { get; set; } = string.Empty;
    // Content body text property
    public string Content { get; set; } = string.Empty;
    // Boolean global flag property
    public bool IsGlobal { get; set; }
    // Department GUID ID property
    public Guid? DepartmentId { get; set; }
    // Target role ID string property
    public string? TargetRoleId { get; set; }
    // Publication timestamp property
    public DateTime? PublishedAt { get; set; }
    // Expiration timestamp property
    public DateTime? ExpiresAt { get; set; }
    // Pinned flag property
    public bool IsPinned { get; set; }
    // Single class workspace GUID ID property
    public Guid? ClassWorkspaceId { get; set; }
    // Array of target class workspace GUID IDs property
    public Guid[]? ClassWorkspaceIds { get; set; }
    // Search tags string property
    public string? Tags { get; set; }
    // Priority string property ("Urgent" | "Important" | "General")
    public string? Priority { get; set; } = "General";
    // Category string property ("General" | "Exam" | "Assignment" | "Event" | "Resource" | "Meeting")
    public string? Category { get; set; } = "General";
}

// Model representing announcement update request body
public class UpdateAnnouncementModel
{
    // Title property
    public string Title { get; set; } = string.Empty;
    // Content body text property
    public string Content { get; set; } = string.Empty;
    // Boolean global flag property
    public bool IsGlobal { get; set; }
    // Department GUID ID property
    public Guid? DepartmentId { get; set; }
    // Target role ID string property
    public string? TargetRoleId { get; set; }
    // Expiration timestamp property
    public DateTime? ExpiresAt { get; set; }
    // Pinned flag property
    public bool IsPinned { get; set; }
    // Search tags string property
    public string? Tags { get; set; }
    // Priority string property
    public string? Priority { get; set; } = "General";
    // Category string property
    public string? Category { get; set; } = "General";
}
