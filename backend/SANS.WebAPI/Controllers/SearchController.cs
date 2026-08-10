using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SANS.Infrastructure.Services.D1;
using System.Security.Claims;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly D1Context _context;

    public SearchController(D1Context context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GlobalSearch([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest(new { Message = "Search query is required" });
        }

        var normalizedQuery = q.Trim().ToLower();
        var likeQuery = $"%{normalizedQuery}%";

        // Search Announcements
        var announcements = await _context.Announcements.QueryAsync(
            "WHERE \"IsDeleted\" = 0 AND (lower(\"Title\") LIKE ? OR lower(\"Content\") LIKE ?) LIMIT 10",
            null,
            new object?[] { likeQuery, likeQuery });

        // Search Assignments
        var assignments = await _context.Assignments.QueryAsync(
            "WHERE \"IsDeleted\" = 0 AND (lower(\"Title\") LIKE ? OR lower(\"Description\") LIKE ?) LIMIT 10",
            null,
            new object?[] { likeQuery, likeQuery });

        // Search Resources
        var resources = await _context.LearningResources.QueryAsync(
            "WHERE \"IsDeleted\" = 0 AND (lower(\"Title\") LIKE ? OR lower(\"Description\") LIKE ?) LIMIT 10",
            null,
            new object?[] { likeQuery, likeQuery });

        // Search Classes
        var classes = await _context.ClassWorkspaces.QueryAsync(
            "WHERE \"IsDeleted\" = 0 AND (lower(\"Name\") LIKE ? OR lower(\"Code\") LIKE ?) LIMIT 10",
            null,
            new object?[] { likeQuery, likeQuery });

        var mergedResults = announcements
            .Select(a => new { a.Id, a.Title, Type = "Announcement" })
            .Concat(assignments.Select(a => new { a.Id, a.Title, Type = "Assignment" }))
            .Concat(resources.Select(r => new { r.Id, Title = r.Title, Type = "Resource" }))
            .Concat(classes.Select(c => new { c.Id, Title = $"{c.Code} - {c.Name}", Type = "Class" }))
            .ToList();

        return Ok(mergedResults);
    }
}
