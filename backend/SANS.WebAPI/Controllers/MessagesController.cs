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

    [HttpGet("class/{classId}")]
    public async Task<IActionResult> GetClassMessages(Guid classId)
    {
        var messages = await _unitOfWork.Messages.GetAllAsync();
        
        // Include sender details from the DB context as needed
        var classMessages = messages
            .Where(m => !m.IsDeleted && m.ClassWorkspaceId == classId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new {
                m.Id,
                m.Content,
                m.SenderId,
                SenderName = m.Sender != null ? $"{m.Sender.FirstName} {m.Sender.LastName}" : "Unknown User",
                SenderRole = m.Sender != null ? (int)m.Sender.Role : 0,
                m.CreatedAt,
                m.AttachmentUrl
            });
            
        return Ok(classMessages);
    }

    [HttpPost("class/{classId}")]
    public async Task<IActionResult> SendClassMessage(Guid classId, [FromBody] CreateClassMessageModel model)
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
            ClassWorkspaceId = classId,
            IsRead = false,
            AttachmentUrl = model.AttachmentUrl,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Messages.AddAsync(message);
        await _unitOfWork.SaveChangesAsync();

        return Ok(message);
    }

    [HttpPost("class/bulk")]
    public async Task<IActionResult> SendBulkClassMessages([FromBody] BulkClassMessageModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        if (model.ClassWorkspaceIds == null || model.ClassWorkspaceIds.Length == 0)
        {
            return BadRequest(new { Message = "At least one target class is required." });
        }

        foreach (var classId in model.ClassWorkspaceIds)
        {
            var message = new Message
            {
                Id = Guid.NewGuid(),
                Content = model.Content,
                SenderId = userId,
                ClassWorkspaceId = classId,
                IsRead = false,
                AttachmentUrl = model.AttachmentUrl,
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Messages.AddAsync(message);
        }

        await _unitOfWork.SaveChangesAsync();
        return Ok(new { Message = "Messages sent successfully to all selected classes." });
    }
}

public class CreateMessageModel
{
    public string Content { get; set; } = string.Empty;
    public Guid ReceiverId { get; set; }
    public Guid? ChannelId { get; set; }
    public string? AttachmentUrl { get; set; }
}

public class CreateClassMessageModel
{
    public string Content { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
}

public class BulkClassMessageModel
{
    public string Content { get; set; } = string.Empty;
    public Guid[] ClassWorkspaceIds { get; set; } = Array.Empty<Guid>();
    public string? AttachmentUrl { get; set; }
}
