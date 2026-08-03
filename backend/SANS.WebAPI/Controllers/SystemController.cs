// Import ASP.NET Core authorization namespace for securing or allowing anonymous access to endpoints
using Microsoft.AspNetCore.Authorization;
// Import ASP.NET Core MVC framework namespace for API controller attributes and action results
using Microsoft.AspNetCore.Mvc;
// Import Entity Framework Core namespace for asynchronous database querying
using Microsoft.EntityFrameworkCore;
// Import SANS domain enums namespace for user role definitions
using SANS.Domain.Enums;
// Import SANS infrastructure data namespace for database context access
using SANS.Infrastructure.Data;
// Import System namespace for standard Guid and Task operations
using System;
// Import System Linq namespace for standard query expressions
using System.Linq;
// Import System Threading Tasks namespace for async Task execution
using System.Threading.Tasks;

// Define namespace for SANS Web API system controllers
namespace SANS.WebAPI.Controllers;

// Attribute indicating that this class is an API Controller
[ApiController]
// Set routing path to /api/system
[Route("api/[controller]")]
// SystemController provides public system metrics and health status endpoints
public class SystemController : ControllerBase
{
    // Private read-only field holding the Entity Framework database context instance
    private readonly AppDbContext _context;

    // Constructor injecting the application database context instance
    public SystemController(AppDbContext context)
    {
        // Assign the injected context to the private controller field
        _context = context;
    }

    // GET /api/system/public-stats — Returns live real-time metrics of users, classes, resources, and announcements
    [HttpGet("public-stats")]
    // Allow anonymous public access so landing page can fetch metrics without logging in
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicStats()
    {
        // Query database to count total active non-deleted students and course representatives (excluding faculty and admins)
        var activeStudents = await _context.Users
            // Filter non-deleted users whose role is Student or ClassRepresentative
            .CountAsync(u => !u.IsDeleted && (u.Role == UserRole.Student || u.Role == UserRole.ClassRepresentative));

        // Query database to count total active non-deleted class workspaces registered in the system
        var courseClasses = await _context.ClassWorkspaces
            // Filter non-deleted class workspace records
            .CountAsync(c => !c.IsDeleted);

        // Query database to count total active non-deleted learning resources belonging to active classes or global scope
        var resourcesShared = await _context.LearningResources
            // Filter non-deleted resources that are global or belong to an active non-deleted class workspace
            .CountAsync(r => !r.IsDeleted && (r.ClassWorkspaceId == null || _context.ClassWorkspaces.Any(c => c.Id == r.ClassWorkspaceId && !c.IsDeleted)));

        // Query database to count total active non-deleted academic announcements belonging to active classes or global scope
        var announcementsDelivered = await _context.Announcements
            // Filter non-deleted announcements that are global or belong to an active non-deleted class workspace
            .CountAsync(a => !a.IsDeleted && (a.ClassWorkspaceId == null || _context.ClassWorkspaces.Any(c => c.Id == a.ClassWorkspaceId && !c.IsDeleted)));

        // Return 200 OK with JSON response object containing exact real-time database counts
        return Ok(new
        {
            // Total active student and rep users count
            activeStudents = activeStudents,
            // Total active course class workspaces count
            courseClasses = courseClasses,
            // Total active learning resources shared count
            resourcesShared = resourcesShared,
            // Total active academic announcements delivered count
            announcementsDelivered = announcementsDelivered
        });
    }
}
