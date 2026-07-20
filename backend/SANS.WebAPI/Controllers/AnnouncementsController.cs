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
public class AnnouncementsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly AppDbContext _context;

    public AnnouncementsController(IUnitOfWork unitOfWork, AppDbContext context)
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

        var query = _context.Announcements
            .Where(a => !a.IsDeleted);

        if (classId.HasValue)
        {
            query = query.Where(a => a.ClassWorkspaceId == classId.Value);
        }
        else
        {
            // University Hub context: return only global/university announcements
            query = query.Where(a => a.IsGlobal || a.ClassWorkspaceId == null);
        }

        var list = await query
            .OrderByDescending(a => a.IsPinned)
            .ThenBy(a => a.Priority == "Urgent" ? 0 : a.Priority == "Important" ? 1 : 2)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("global")]
    public async Task<IActionResult> GetGlobal()
    {
        var announcements = await _unitOfWork.Announcements.GetGlobalAnnouncementsAsync();
        return Ok(announcements.Where(a => !a.IsDeleted));
    }

    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        var announcements = await _unitOfWork.Announcements.GetByDepartmentAsync(departmentId);
        return Ok(announcements.Where(a => !a.IsDeleted));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var announcement = await _context.Announcements
            .Include(a => a.ClassWorkspace)
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

        if (announcement == null)
        {
            return NotFound(new { Message = "Announcement not found" });
        }

        // Increment view count
        announcement.ViewCount++;
        
        // Log engagement action "View"
        var userId = GetCurrentUserId();
        if (userId != Guid.Empty)
        {
            var engagement = new AnnouncementEngagement
            {
                Id = Guid.NewGuid(),
                AnnouncementId = id,
                UserId = userId,
                ActionType = "View",
                CreatedAt = DateTime.UtcNow
            };
            await _context.AnnouncementEngagements.AddAsync(engagement);
        }

        await _context.SaveChangesAsync();
        return Ok(announcement);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementModel model)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        // Enforce verified status for lecturers
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
        {
            return Forbid();
        }

        // Prevent Course Representatives from posting global university announcements
        if (dbUser.Role == UserRole.ClassRepresentative && model.IsGlobal)
        {
            return Forbid();
        }

        // Default verification settings based on role
        var status = "General";
        var isVerified = false;

        if (dbUser.Role == UserRole.Lecturer)
        {
            status = "Verified";
            isVerified = true;
        }
        else if (dbUser.Role == UserRole.ClassRepresentative)
        {
            status = "PendingApproval";
            isVerified = false;
        }

        if (model.IsGlobal)
        {
            var announcement = new Announcement
            {
                Id = Guid.NewGuid(),
                Title = model.Title,
                Content = model.Content,
                IsGlobal = true,
                DepartmentId = model.DepartmentId,
                TargetRoleId = !string.IsNullOrEmpty(model.TargetRoleId) ? Guid.Parse(model.TargetRoleId) : null,
                PublishedAt = model.PublishedAt ?? DateTime.UtcNow,
                ExpiresAt = model.ExpiresAt,
                IsPinned = model.IsPinned,
                ClassWorkspaceId = null,
                IsVerified = isVerified,
                Status = status,
                Tags = model.Tags,
                Priority = model.Priority ?? "General",
                Category = model.Category ?? "General",
                CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}",
                CreatedAt = DateTime.UtcNow
            };

            await _context.Announcements.AddAsync(announcement);
            await _context.SaveChangesAsync();

            return Ok(announcement);
        }

        var targetClassIds = new List<Guid>();
        if (model.ClassWorkspaceIds != null && model.ClassWorkspaceIds.Length > 0)
        {
            targetClassIds.AddRange(model.ClassWorkspaceIds);
        }
        else if (model.ClassWorkspaceId.HasValue)
        {
            targetClassIds.Add(model.ClassWorkspaceId.Value);
        }

        if (targetClassIds.Count == 0)
        {
            return BadRequest(new { Message = "At least one target class is required." });
        }

        Announcement firstAnnouncement = null!;

        foreach (var classId in targetClassIds)
        {
            var classWorkspace = await _context.ClassWorkspaces
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == classId && !c.IsDeleted);

            if (classWorkspace == null) continue;

            // Security: Enforce class-scoped Course Representative checks
            if (dbUser.Role == UserRole.ClassRepresentative && classWorkspace.ClassRepresentativeId != userId)
            {
                return Forbid();
            }

            var announcement = new Announcement
            {
                Id = Guid.NewGuid(),
                Title = model.Title,
                Content = model.Content,
                IsGlobal = model.IsGlobal,
                DepartmentId = model.DepartmentId,
                TargetRoleId = !string.IsNullOrEmpty(model.TargetRoleId) ? Guid.Parse(model.TargetRoleId) : null,
                PublishedAt = model.PublishedAt ?? DateTime.UtcNow,
                ExpiresAt = model.ExpiresAt,
                IsPinned = model.IsPinned,
                ClassWorkspaceId = classId,
                IsVerified = isVerified,
                Status = status,
                Tags = model.Tags,
                Priority = model.Priority ?? "General",
                Category = model.Category ?? "General",
                ViewCount = 0,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}"
            };

            await _context.Announcements.AddAsync(announcement);
            if (firstAnnouncement == null) firstAnnouncement = announcement;

            // Trigger notification to students
            foreach (var student in classWorkspace.Students)
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    Title = model.Priority == "Urgent" ? "🔴 URGENT Announcement" : "New Announcement",
                    Message = $"'{model.Title}' has been posted in {classWorkspace.Name}.",
                    Type = NotificationType.Alert,
                    Priority = model.Priority == "Urgent" ? NotificationPriority.Urgent
                        : model.Priority == "Important" ? NotificationPriority.High
                        : NotificationPriority.Normal,
                    IsRead = false,
                    UserId = student.Id,
                    ClassWorkspaceId = classWorkspace.Id,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.Notifications.AddAsync(notification);
            }
        }

        await _context.SaveChangesAsync();

        if (firstAnnouncement == null)
        {
            return BadRequest(new { Message = "No valid class workspaces found to target." });
        }

        return CreatedAtAction(nameof(GetById), new { id = firstAnnouncement.Id }, firstAnnouncement);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementModel model)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null || announcement.IsDeleted)
        {
            return NotFound(new { Message = "Announcement not found" });
        }

        announcement.Title = model.Title;
        announcement.Content = model.Content;
        announcement.IsGlobal = model.IsGlobal;
        announcement.DepartmentId = model.DepartmentId;
        announcement.TargetRoleId = !string.IsNullOrEmpty(model.TargetRoleId) ? Guid.Parse(model.TargetRoleId) : null;
        announcement.ExpiresAt = model.ExpiresAt;
        announcement.IsPinned = model.IsPinned;
        announcement.Tags = model.Tags;
        announcement.Priority = model.Priority ?? "General";
        announcement.Category = model.Category ?? "General";
        announcement.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(announcement);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null || announcement.IsDeleted)
        {
            return NotFound(new { Message = "Announcement not found" });
        }

        announcement.IsDeleted = true;
        announcement.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Announcement deleted successfully" });
    }

    // --- APPROVAL WORKFLOWS ---
    [HttpPost("{id}/submit-approval")]
    public async Task<IActionResult> SubmitForApproval(Guid id)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null || announcement.IsDeleted) return NotFound();

        announcement.Status = "PendingApproval";
        await _context.SaveChangesAsync();
        return Ok(announcement);
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || dbUser.Role != UserRole.Lecturer) return Forbid();

        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null || announcement.IsDeleted) return NotFound();

        announcement.Status = "Verified";
        announcement.IsVerified = true;
        await _context.SaveChangesAsync();
        return Ok(announcement);
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || dbUser.Role != UserRole.Lecturer) return Forbid();

        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null || announcement.IsDeleted) return NotFound();

        announcement.Status = "Rejected";
        announcement.IsVerified = false;
        await _context.SaveChangesAsync();
        return Ok(announcement);
    }

    // --- ENGAGEMENT TRACKING & ANALYTICS ---
    [HttpPost("{id}/engage")]
    public async Task<IActionResult> LogEngagement(Guid id, [FromQuery] string actionType)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null || announcement.IsDeleted) return NotFound();

        var engagement = new AnnouncementEngagement
        {
            Id = Guid.NewGuid(),
            AnnouncementId = id,
            UserId = userId,
            ActionType = actionType, // "View", "Download", "Bookmark"
            CreatedAt = DateTime.UtcNow
        };

        await _context.AnnouncementEngagements.AddAsync(engagement);
        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("{id}/analytics")]
    public async Task<IActionResult> GetEngagementAnalytics(Guid id)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null || announcement.IsDeleted) return NotFound();

        var views = await _context.AnnouncementEngagements.CountAsync(e => e.AnnouncementId == id && e.ActionType == "View");
        var downloads = await _context.AnnouncementEngagements.CountAsync(e => e.AnnouncementId == id && e.ActionType == "Download");
        var bookmarks = await _context.AnnouncementEngagements.CountAsync(e => e.AnnouncementId == id && e.ActionType == "Bookmark");

        return Ok(new
        {
            AnnouncementId = id,
            ViewsCount = views + announcement.ViewCount,
            DownloadsCount = downloads,
            BookmarksCount = bookmarks
        });
    }
}

public class CreateAnnouncementModel
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsGlobal { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? TargetRoleId { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsPinned { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
    public Guid[]? ClassWorkspaceIds { get; set; }
    public string? Tags { get; set; }
    public string? Priority { get; set; } = "General";  // "Urgent" | "Important" | "General"
    public string? Category { get; set; } = "General"; // "General" | "Exam" | "Assignment" | "Event" | "Resource" | "Meeting"
}

public class UpdateAnnouncementModel
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsGlobal { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? TargetRoleId { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsPinned { get; set; }
    public string? Tags { get; set; }
    public string? Priority { get; set; } = "General";
    public string? Category { get; set; } = "General";
}

