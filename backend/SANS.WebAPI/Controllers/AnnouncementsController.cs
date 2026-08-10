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
public class AnnouncementsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly D1Context _context;

    public AnnouncementsController(IUnitOfWork unitOfWork, D1Context context)
    {
        _unitOfWork = unitOfWork;
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    // GET /api/announcements — Returns announcements accessible to the current user
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        var announcements = await _context.Announcements.QueryAsync("WHERE \"IsDeleted\" = 0");

        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            announcements = announcements
                .Where(a => a.ClassWorkspaceId == classId.Value || a.IsGlobal || a.ClassWorkspaceId == null)
                .ToList();
        }
        else
        {
            // Fetch accessible class workspace IDs for current user (enrolled, lecturer, 1st/2nd Rep, creator)
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

            announcements = announcements
                .Where(a => a.IsGlobal || a.ClassWorkspaceId == null || (a.ClassWorkspaceId != null && userClassIds.Contains(a.ClassWorkspaceId.Value)))
                .ToList();
        }

        // Order pinned first, then priority weight (Urgent=0, Important=1, General=2), then newest
        var list = announcements
            .OrderByDescending(a => a.IsPinned)
            .ThenBy(a => a.Priority == "Urgent" ? 0 : a.Priority == "Important" ? 1 : 2)
            .ThenByDescending(a => a.CreatedAt)
            .ToList();

        return Ok(list);
    }

    // GET /api/announcements/global — Returns global university-wide announcements
    [HttpGet("global")]
    public async Task<IActionResult> GetGlobal()
    {
        var announcements = await _unitOfWork.Announcements.GetGlobalAnnouncementsAsync();
        return Ok(announcements.Where(a => !a.IsDeleted));
    }

    // GET /api/announcements/department/{departmentId} — Returns announcements for a specific department
    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        var announcements = await _unitOfWork.Announcements.GetByDepartmentAsync(departmentId);
        return Ok(announcements.Where(a => !a.IsDeleted));
    }

    // GET /api/announcements/{id} — Returns detailed announcement record by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var announcement = await _context.Announcements.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });

        if (announcement == null)
        {
            return NotFound(new { Message = "Announcement not found" });
        }

        // Load class workspace navigation property
        if (announcement.ClassWorkspaceId.HasValue)
        {
            announcement.ClassWorkspace = await _context.ClassWorkspaces.FindAsync(announcement.ClassWorkspaceId.Value);
        }

        // Increment announcement view counter
        announcement.ViewCount++;
        _context.Announcements.Update(announcement);
        await _context.SaveChangesAsync();

        return Ok(announcement);
    }

    // POST /api/announcements — Publishes a new academic notice announcement
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.ClassRepresentative && dbUser.Role != UserRole.Administrator))
        {
            return Forbid();
        }

        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
        {
            return Forbid();
        }

        if (dbUser.Role == UserRole.ClassRepresentative && model.IsGlobal)
        {
            return Forbid();
        }

        bool isVerified = false;
        string initialStatus = "Draft";

        if (dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.Administrator)
        {
            isVerified = true;
            initialStatus = "Verified";
        }
        else if (dbUser.Role == UserRole.ClassRepresentative)
        {
            isVerified = false;
            initialStatus = "PendingApproval";
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
                var firstDept = await _context.Departments.QueryFirstOrDefaultAsync("");
                if (firstDept != null)
                {
                    resolvedDeptId = firstDept.Id;
                }
            }
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

        Announcement firstAnnouncement = null!;

        // Global announcement
        if (model.IsGlobal || targetClassIds.Count == 0)
        {
            var announcement = new Announcement
            {
                Id = Guid.NewGuid(),
                Title = model.Title,
                Content = model.Content,
                IsGlobal = model.IsGlobal,
                DepartmentId = resolvedDeptId,
                TargetRoleId = !string.IsNullOrEmpty(model.TargetRoleId) ? Guid.Parse(model.TargetRoleId) : null,
                PublishedAt = model.PublishedAt ?? DateTime.UtcNow,
                ExpiresAt = model.ExpiresAt,
                IsPinned = model.IsPinned,
                ClassWorkspaceId = null,
                IsVerified = isVerified,
                Status = initialStatus,
                Tags = model.Tags ?? string.Empty,
                Priority = model.Priority ?? "General",
                Category = model.Category ?? "General",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}"
            };

            await _unitOfWork.Announcements.AddAsync(announcement);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = announcement.Id }, announcement);
        }

        foreach (var classId in targetClassIds)
        {
            var classWorkspace = await _context.ClassWorkspaces.QueryFirstOrDefaultAsync(
                "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
                new object?[] { classId });

            if (classWorkspace == null) continue;

            if (dbUser.Role == UserRole.ClassRepresentative && classWorkspace.ClassRepresentativeId != userId && classWorkspace.SecondClassRepresentativeId != userId)
            {
                return Forbid();
            }

            var announcement = new Announcement
            {
                Id = Guid.NewGuid(),
                Title = model.Title,
                Content = model.Content,
                IsGlobal = model.IsGlobal,
                DepartmentId = resolvedDeptId,
                TargetRoleId = !string.IsNullOrEmpty(model.TargetRoleId) ? Guid.Parse(model.TargetRoleId) : null,
                PublishedAt = model.PublishedAt ?? DateTime.UtcNow,
                ExpiresAt = model.ExpiresAt,
                IsPinned = model.IsPinned,
                ClassWorkspaceId = classId,
                IsVerified = isVerified,
                Status = initialStatus,
                Tags = model.Tags ?? string.Empty,
                Priority = model.Priority ?? "General",
                Category = model.Category ?? "General",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = $"{dbUser.FirstName} {dbUser.LastName}"
            };

            await _unitOfWork.Announcements.AddAsync(announcement);
            if (firstAnnouncement == null) firstAnnouncement = announcement;

            // Notify enrolled students
            var students = await _context.GetEnrolledStudentsAsync(classWorkspace.Id);
            foreach (var student in students)
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    Title = "New Announcement Published",
                    Message = $"Notice '{model.Title}' has been posted in {classWorkspace.Name}.",
                    Type = NotificationType.Alert,
                    Priority = model.Priority == "Urgent" ? NotificationPriority.High : NotificationPriority.Normal,
                    IsRead = false,
                    UserId = student.Id,
                    ClassWorkspaceId = classWorkspace.Id,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.Notifications.AddAsync(notification);
            }
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = firstAnnouncement.Id }, firstAnnouncement);
    }

    // PUT /api/announcements/{id} — Updates announcement content
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementModel model)
    {
        var announcement = await _unitOfWork.Announcements.GetByIdAsync(id);
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
        announcement.Tags = model.Tags ?? string.Empty;
        announcement.Priority = model.Priority ?? "General";
        announcement.Category = model.Category ?? "General";
        announcement.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Announcements.UpdateAsync(announcement);
        await _unitOfWork.SaveChangesAsync();

        return Ok(announcement);
    }

    // DELETE /api/announcements/{id} — Soft-deletes an announcement
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var announcement = await _unitOfWork.Announcements.GetByIdAsync(id);
        if (announcement == null || announcement.IsDeleted)
        {
            return NotFound(new { Message = "Announcement not found" });
        }

        announcement.IsDeleted = true;
        announcement.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.Announcements.UpdateAsync(announcement);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Announcement deleted successfully" });
    }

    // POST /api/announcements/{id}/submit-approval — Submits Course Rep announcement for lecturer verification
    [HttpPost("{id}/submit-approval")]
    public async Task<IActionResult> SubmitForApproval(Guid id)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null || announcement.IsDeleted) return NotFound();

        announcement.Status = "PendingApproval";
        _context.Announcements.Update(announcement);
        await _context.SaveChangesAsync();

        return Ok(announcement);
    }

    // POST /api/announcements/{id}/approve — Lecturer verifies and approves Course Rep announcement
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
        _context.Announcements.Update(announcement);
        await _context.SaveChangesAsync();

        return Ok(announcement);
    }

    // POST /api/announcements/{id}/reject — Lecturer rejects Course Rep announcement
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
        _context.Announcements.Update(announcement);
        await _context.SaveChangesAsync();

        return Ok(announcement);
    }

    // POST /api/announcements/{id}/engage — Logs user engagement metrics (View, Download, Bookmark)
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
            ActionType = actionType,
            CreatedAt = DateTime.UtcNow
        };

        await _context.AnnouncementEngagements.AddAsync(engagement);
        await _context.SaveChangesAsync();

        return Ok();
    }

    // GET /api/announcements/{id}/analytics — Returns engagement analytics for an announcement
    [HttpGet("{id}/analytics")]
    public async Task<IActionResult> GetEngagementAnalytics(Guid id)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null || announcement.IsDeleted) return NotFound();

        var views = await _context.AnnouncementEngagements.CountAsync(
            "WHERE lower(\"AnnouncementId\") = lower(?) AND \"ActionType\" = 'View'",
            new object?[] { id });
        var downloads = await _context.AnnouncementEngagements.CountAsync(
            "WHERE lower(\"AnnouncementId\") = lower(?) AND \"ActionType\" = 'Download'",
            new object?[] { id });
        var bookmarks = await _context.AnnouncementEngagements.CountAsync(
            "WHERE lower(\"AnnouncementId\") = lower(?) AND \"ActionType\" = 'Bookmark'",
            new object?[] { id });

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
    public string? Priority { get; set; } = "General";
    public string? Category { get; set; } = "General";
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
