using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SANS.Infrastructure.Services.D1;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    private readonly D1Context _context;

    public SystemController(D1Context context)
    {
        _context = context;
    }

    // GET /api/system/public-stats — Returns live real-time metrics of users, classes, resources, and announcements
    [HttpGet("public-stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicStats()
    {
        // Count total active non-deleted students and course representatives (excluding faculty and admins)
        var activeStudents = await _context.Users.CountAsync(
            "WHERE \"IsDeleted\" = 0 AND (\"Role\" = 0 OR \"Role\" = 2)");

        // Count total active non-deleted class workspaces registered in the system
        var courseClasses = await _context.ClassWorkspaces.CountAsync("WHERE \"IsDeleted\" = 0");

        // Count total active non-deleted learning resources belonging to active classes or global scope
        var resourcesShared = await _context.ScalarAsync(
            "SELECT COUNT(*) FROM \"LearningResources\" r WHERE r.\"IsDeleted\" = 0 " +
            "AND (r.\"ClassWorkspaceId\" IS NULL OR EXISTS " +
            "(SELECT 1 FROM \"ClassWorkspaces\" c WHERE c.\"Id\" = r.\"ClassWorkspaceId\" AND c.\"IsDeleted\" = 0))");

        // Count total active non-deleted academic announcements belonging to active classes or global scope
        var announcementsDelivered = await _context.ScalarAsync(
            "SELECT COUNT(*) FROM \"Announcements\" a WHERE a.\"IsDeleted\" = 0 " +
            "AND (a.\"ClassWorkspaceId\" IS NULL OR EXISTS " +
            "(SELECT 1 FROM \"ClassWorkspaces\" c WHERE c.\"Id\" = a.\"ClassWorkspaceId\" AND c.\"IsDeleted\" = 0))");

        return Ok(new
        {
            activeStudents,
            courseClasses,
            resourcesShared,
            announcementsDelivered
        });
    }
}
