using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public MessagesController(IUnitOfWork unitOfWork)
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

        var messages = await _unitOfWork.Messages.GetAllAsync();
        var userMessages = messages.Where(m => 
            !m.IsDeleted && (m.SenderId == userId || m.ReceiverId == userId));
        return Ok(userMessages);
    }

    [HttpGet("conversation/{userId1}/{userId2}")]
    public async Task<IActionResult> GetConversation(Guid userId1, Guid userId2)
    {
        var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (currentUserIdClaim == null || !Guid.TryParse(currentUserIdClaim.Value, out Guid currentUserId))
        {
            return Unauthorized();
        }

        if (currentUserId != userId1 && currentUserId != userId2)
        {
            return Forbid();
        }

        var messages = await _unitOfWork.Messages.GetConversationAsync(userId1, userId2);
        return Ok(messages.Where(m => !m.IsDeleted));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var message = await _unitOfWork.Messages.GetByIdAsync(id);
        if (message == null || message.IsDeleted)
        {
            return NotFound(new { Message = "Message not found" });
        }
        return Ok(message);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMessageModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var message = new Message
        {
            Id = Guid.NewGuid(),
            Content = model.Content,
            SenderId = userId,
            ReceiverId = model.ReceiverId,
            ChannelId = model.ChannelId,
            IsRead = false,
            AttachmentUrl = model.AttachmentUrl,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Messages.AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = message.Id }, message);
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var message = await _unitOfWork.Messages.GetByIdAsync(id);
        if (message == null || message.IsDeleted)
        {
            return NotFound(new { Message = "Message not found" });
        }

        if (message.ReceiverId != userId)
        {
            return Forbid();
        }

        message.IsRead = true;
        message.ReadAt = DateTime.UtcNow;
        message.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Messages.UpdateAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return Ok(message);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var message = await _unitOfWork.Messages.GetByIdAsync(id);
        if (message == null || message.IsDeleted)
        {
            return NotFound(new { Message = "Message not found" });
        }

        message.IsDeleted = true;
        message.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.Messages.UpdateAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "Message deleted successfully" });
    }
}

public class CreateMessageModel
{
    public string Content { get; set; } = string.Empty;
    public Guid ReceiverId { get; set; }
    public Guid? ChannelId { get; set; }
    public string? AttachmentUrl { get; set; }
}
