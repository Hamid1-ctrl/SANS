using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnnouncementsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public AnnouncementsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var announcements = await _unitOfWork.Announcements.GetAllAsync();
        return Ok(announcements.Where(a => !a.IsDeleted));
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
        var announcement = await _unitOfWork.Announcements.GetByIdAsync(id);
        if (announcement == null || announcement.IsDeleted)
        {
            return NotFound(new { Message = "Announcement not found" });
        }

        // Increment view count
        announcement.ViewCount++;
        await _unitOfWork.Announcements.UpdateAsync(announcement);
        await _unitOfWork.SaveChangesAsync();

        return Ok(announcement);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var announcement = new Announcement
        {
            Id = Guid.NewGuid(),
            Title = model.Title,
            Content = model.Content,
            IsGlobal = model.IsGlobal,
            DepartmentId = model.DepartmentId,
            TargetRoleId = !string.IsNullOrEmpty(model.TargetRoleId) ? Guid.Parse(model.TargetRoleId) : null,
            PublishedAt = model.PublishedAt,
            ExpiresAt = model.ExpiresAt,
            IsPinned = model.IsPinned,
            ViewCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Announcements.AddAsync(announcement);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = announcement.Id }, announcement);
    }

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
        announcement.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Announcements.UpdateAsync(announcement);
        await _unitOfWork.SaveChangesAsync();

        return Ok(announcement);
    }

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
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "Announcement deleted successfully" });
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
}
