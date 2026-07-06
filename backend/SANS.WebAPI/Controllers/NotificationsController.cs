using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;
using SANS.Domain.Enums;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public NotificationsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var notifications = await _unitOfWork.Notifications.GetByUserIdAsync(userId);
        return Ok(notifications.Where(n => !n.IsDeleted));
    }

    [HttpGet("unread")]
    public async Task<IActionResult> GetUnread()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var notifications = await _unitOfWork.Notifications.GetByUserIdAsync(userId);
        var unreadNotifications = notifications.Where(n => !n.IsDeleted && !n.IsRead);
        return Ok(unreadNotifications);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var notification = await _unitOfWork.Notifications.GetByIdAsync(id);
        if (notification == null || notification.IsDeleted)
        {
            return NotFound(new { Message = "Notification not found" });
        }
        return Ok(notification);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNotificationModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            Title = model.Title,
            Message = model.Message,
            Type = (NotificationType)model.Type,
            Priority = (NotificationPriority)model.Priority,
            IsRead = false,
            UserId = model.UserId,
            AnnouncementId = model.AnnouncementId,
            AssignmentId = model.AssignmentId,
            ActionUrl = model.ActionUrl,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Notifications.AddAsync(notification);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = notification.Id }, notification);
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var notification = await _unitOfWork.Notifications.GetByIdAsync(id);
        if (notification == null || notification.IsDeleted)
        {
            return NotFound(new { Message = "Notification not found" });
        }

        if (notification.UserId != userId)
        {
            return Forbid();
        }

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        notification.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Notifications.UpdateAsync(notification);
        await _unitOfWork.SaveChangesAsync();

        return Ok(notification);
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var notifications = await _unitOfWork.Notifications.GetByUserIdAsync(userId);
        var unreadNotifications = notifications.Where(n => !n.IsDeleted && !n.IsRead);

        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            notification.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.Notifications.UpdateAsync(notification);
        }

        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "All notifications marked as read" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var notification = await _unitOfWork.Notifications.GetByIdAsync(id);
        if (notification == null || notification.IsDeleted)
        {
            return NotFound(new { Message = "Notification not found" });
        }

        notification.IsDeleted = true;
        notification.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.Notifications.UpdateAsync(notification);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "Notification deleted successfully" });
    }
}

public class CreateNotificationModel
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int Type { get; set; }
    public int Priority { get; set; }
    public Guid UserId { get; set; }
    public Guid? AnnouncementId { get; set; }
    public Guid? AssignmentId { get; set; }
    public string? ActionUrl { get; set; }
}
