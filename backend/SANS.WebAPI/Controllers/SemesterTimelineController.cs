using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Services.D1;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/semester-timeline")]
[Authorize]
public class SemesterTimelineController : ControllerBase
{
    private readonly D1Context _context;

    public SemesterTimelineController(D1Context context)
    {
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var firebaseUid = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(firebaseUid)) return Guid.Empty;
        if (Guid.TryParse(firebaseUid, out var directGuid)) return directGuid;

        var user = _context.Users.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"FirebaseUid\") = lower(?)",
            new object?[] { firebaseUid }).GetAwaiter().GetResult();
        return user?.Id ?? Guid.Empty;
    }

    // GET /api/semester-timeline/{classWorkspaceId}
    [HttpGet("{classWorkspaceId}")]
    public async Task<IActionResult> GetTimeline(Guid classWorkspaceId)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var timeline = await _context.SemesterTimelines.QueryFirstOrDefaultAsync(
            "WHERE lower(\"ClassWorkspaceId\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { classWorkspaceId });

        if (timeline == null)
        {
            // Return default values so the frontend always has something to display
            return Ok(new
            {
                id = (string?)null,
                classWorkspaceId,
                semesterName = "Semester 1",
                totalWeeks = 16,
                startDate = (DateTime?)null,
                endDate = (DateTime?)null,
                examStartDate = (DateTime?)null,
                notes = (string?)null,
                isConfigured = false
            });
        }

        return Ok(new
        {
            id = timeline.Id,
            classWorkspaceId = timeline.ClassWorkspaceId,
            semesterName = timeline.SemesterName,
            totalWeeks = timeline.TotalWeeks,
            startDate = timeline.StartDate,
            endDate = timeline.EndDate,
            examStartDate = timeline.ExamStartDate,
            notes = timeline.Notes,
            isConfigured = true
        });
    }

    // PUT /api/semester-timeline/{classWorkspaceId}
    [HttpPut("{classWorkspaceId}")]
    [HttpPost("{classWorkspaceId}")]
    public async Task<IActionResult> UpsertTimeline(Guid classWorkspaceId, [FromBody] UpsertTimelineModel model)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return Unauthorized();

        bool isStaff = dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.ClassRepresentative || dbUser.Role == UserRole.Administrator;
        if (!isStaff)
            return Forbid();

        var classWorkspace = await _context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { classWorkspaceId });
        if (classWorkspace == null)
            return NotFound(new { Message = "Class workspace not found." });

        var existing = await _context.SemesterTimelines.QueryFirstOrDefaultAsync(
            "WHERE lower(\"ClassWorkspaceId\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { classWorkspaceId });

        if (existing != null)
        {
            existing.SemesterName = model.SemesterName ?? existing.SemesterName;
            existing.TotalWeeks = model.TotalWeeks ?? existing.TotalWeeks;
            existing.StartDate = model.StartDate ?? existing.StartDate;
            existing.EndDate = model.EndDate ?? existing.EndDate;
            existing.ExamStartDate = model.ExamStartDate;
            existing.Notes = model.Notes;
            existing.UpdatedByUserId = userId;
            existing.UpdatedAt = DateTime.UtcNow;
            _context.SemesterTimelines.Update(existing);
        }
        else
        {
            var timeline = new SemesterTimeline
            {
                ClassWorkspaceId = classWorkspaceId,
                SemesterName = model.SemesterName ?? "Semester 1",
                TotalWeeks = model.TotalWeeks ?? 16,
                StartDate = model.StartDate ?? DateTime.UtcNow,
                EndDate = model.EndDate ?? DateTime.UtcNow.AddDays(112),
                ExamStartDate = model.ExamStartDate,
                Notes = model.Notes,
                UpdatedByUserId = userId
            };
            _context.SemesterTimelines.Add(timeline);
        }

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Semester timeline updated successfully." });
    }
}

public class UpsertTimelineModel
{
    public string? SemesterName { get; set; }
    public int? TotalWeeks { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? ExamStartDate { get; set; }
    public string? Notes { get; set; }
}
