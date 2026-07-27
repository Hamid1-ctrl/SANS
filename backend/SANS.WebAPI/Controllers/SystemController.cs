using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    private readonly AppDbContext _context;

    public SystemController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("public-stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicStats()
    {
        var activeStudents = await _context.Users
            .CountAsync(u => !u.IsDeleted && u.IsActive && u.Role == UserRole.Student);

        // If activeStudents is 0, count all active users as fallback
        if (activeStudents == 0)
        {
            activeStudents = await _context.Users
                .CountAsync(u => !u.IsDeleted && u.IsActive);
        }

        var courseClasses = await _context.ClassWorkspaces
            .CountAsync(c => !c.IsDeleted);

        var resourcesShared = await _context.LearningResources
            .CountAsync(r => !r.IsDeleted);

        var announcementsDelivered = await _context.Announcements
            .CountAsync(a => !a.IsDeleted);

        return Ok(new
        {
            ActiveStudents = activeStudents,
            CourseClasses = courseClasses,
            ResourcesShared = resourcesShared,
            AnnouncementsDelivered = announcementsDelivered
        });
    }
}
