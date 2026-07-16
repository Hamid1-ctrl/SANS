using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SANS.Infrastructure.Data;
using System.Security.Claims;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _context;

    public SearchController(AppDbContext context)
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

        // Search Announcements
        var announcements = await _context.Announcements
            .Where(a => !a.IsDeleted && (a.Title.ToLower().Contains(normalizedQuery) || a.Content.ToLower().Contains(normalizedQuery)))
            .Select(a => new { a.Id, a.Title, Type = "Announcement" })
            .Take(10)
            .ToListAsync();

        // Search Assignments
        var assignments = await _context.Assignments
            .Where(a => !a.IsDeleted && (a.Title.ToLower().Contains(normalizedQuery) || a.Description.ToLower().Contains(normalizedQuery)))
            .Select(a => new { a.Id, a.Title, Type = "Assignment" })
            .Take(10)
            .ToListAsync();

        // Search Resources
        var resources = await _context.LearningResources
            .Where(r => !r.IsDeleted && (r.Title.ToLower().Contains(normalizedQuery) || r.Description.ToLower().Contains(normalizedQuery)))
            .Select(r => new { r.Id, Title = r.Title, Type = "Resource" })
            .Take(10)
            .ToListAsync();

        // Search Classes
        var classes = await _context.ClassWorkspaces
            .Where(c => !c.IsDeleted && (c.Name.ToLower().Contains(normalizedQuery) || c.Code.ToLower().Contains(normalizedQuery)))
            .Select(c => new { c.Id, Title = $"{c.Code} - {c.Name}", Type = "Class" })
            .Take(10)
            .ToListAsync();

        var mergedResults = announcements
            .Concat(assignments)
            .Concat(resources)
            .Concat(classes)
            .ToList();

        return Ok(mergedResults);
    }
}
