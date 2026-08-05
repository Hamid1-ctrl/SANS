using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Services;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;
using SANS.WebAPI.Hubs;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DiscussionsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IStorageService _storageService;
    private readonly IHubContext<NotificationHub> _hubContext;

    public DiscussionsController(AppDbContext context, IStorageService storageService, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _storageService = storageService;
        _hubContext = hubContext;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var firebaseUid = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(firebaseUid)) return null;

        var user = await _context.Users
            .Where(u => !u.IsDeleted)
            .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);

        if (user == null && Guid.TryParse(firebaseUid, out var parsedGuid))
        {
            user = await _context.Users
                .Where(u => !u.IsDeleted)
                .FirstOrDefaultAsync(u => u.Id == parsedGuid);
        }

        return user;
    }

    // ─── 1. Get Threads ──────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetThreads(
        [FromQuery] Guid? classWorkspaceId,
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] string? filter)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var query = _context.DiscussionThreads
            .Include(t => t.Author)
            .Include(t => t.ClassWorkspace)
            .Include(t => t.Attachments)
            .Where(t => !t.IsDeleted);

        if (classWorkspaceId.HasValue && classWorkspaceId.Value != Guid.Empty)
        {
            query = query.Where(t => t.ClassWorkspaceId == classWorkspaceId.Value);
        }
        else if (currentUser.Role == UserRole.Student || currentUser.Role == UserRole.ClassRepresentative)
        {
            // Only show threads for classes the student/rep is enrolled in
            var enrolledClassIds = await _context.ClassWorkspaces
                .Where(c => !c.IsDeleted && c.Students.Any(s => s.Id == currentUser.Id))
                .Select(c => c.Id)
                .ToListAsync();

            query = query.Where(t => enrolledClassIds.Contains(t.ClassWorkspaceId));
        }

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(t => t.Category.ToLower() == category.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(term) || t.Content.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter))
        {
            switch (filter.ToLower())
            {
                case "pinned":
                    query = query.Where(t => t.IsPinned);
                    break;
                case "unanswered":
                    query = query.Where(t => t.RepliesCount == 0);
                    break;
                case "newest":
                    query = query.OrderByDescending(t => t.CreatedAt);
                    break;
                default:
                    break;
            }
        }

        if (string.IsNullOrWhiteSpace(filter) || filter.ToLower() != "newest")
        {
            query = query.OrderByDescending(t => t.IsPinned)
                         .ThenByDescending(t => t.LastActivityAt);
        }

        var threads = await query.Select(t => new
        {
            t.Id,
            t.ClassWorkspaceId,
            ClassName = t.ClassWorkspace != null ? t.ClassWorkspace.Name : "General",
            ClassCode = t.ClassWorkspace != null ? t.ClassWorkspace.Code : "",
            t.Title,
            t.Content,
            t.Category,
            t.IsPinned,
            t.IsLocked,
            t.RepliesCount,
            t.LastActivityAt,
            t.CreatedAt,
            Author = t.Author != null ? new
            {
                t.Author.Id,
                Name = $"{t.Author.FirstName} {t.Author.LastName}",
                Role = (int)t.Author.Role,
                RoleName = t.Author.Role.ToString(),
                AvatarText = $"{t.Author.FirstName.Substring(0, 1)}{t.Author.LastName.Substring(0, 1)}",
                t.Author.ProfileImageUrl
            } : null,
            Attachments = t.Attachments.Select(a => new
            {
                a.Id,
                a.FileName,
                a.FileUrl,
                a.FileType,
                a.FileSize
            })
        }).ToListAsync();

        return Ok(threads);
    }

    // ─── 2. Create Thread ────────────────────────────────────────────────────────
    [HttpPost]
    [RequestSizeLimit(50_000_000)] // 50MB
    public async Task<IActionResult> CreateThread([FromForm] CreateThreadForm form)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        if (string.IsNullOrWhiteSpace(form.Title) || string.IsNullOrWhiteSpace(form.Content))
        {
            return BadRequest(new { Message = "Title and Content are required." });
        }

        var thread = new DiscussionThread
        {
            ClassWorkspaceId = form.ClassWorkspaceId,
            Title = form.Title.Trim(),
            Content = form.Content.Trim(),
            Category = string.IsNullOrWhiteSpace(form.Category) ? "General" : form.Category.Trim(),
            AuthorId = currentUser.Id,
            CreatedAt = DateTime.UtcNow,
            LastActivityAt = DateTime.UtcNow
        };

        if (form.Files != null && form.Files.Count > 0)
        {
            foreach (var file in form.Files)
            {
                if (file.Length == 0) continue;
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                var safeName = $"discussions/{Guid.NewGuid()}{ext}";
                using var stream = file.OpenReadStream();
                var fileUrl = await _storageService.UploadFileAsync(safeName, stream, "discussions");

                thread.Attachments.Add(new DiscussionAttachment
                {
                    FileName = file.FileName,
                    FileUrl = fileUrl,
                    FileType = ext.Replace(".", ""),
                    FileSize = file.Length,
                    UploadedAt = DateTime.UtcNow
                });
            }
        }

        _context.DiscussionThreads.Add(thread);
        await _context.SaveChangesAsync();

        // Broadcast SignalR real-time notification
        await _hubContext.Clients.All.SendAsync("ReceiveDiscussionUpdate", new { Action = "ThreadCreated", ThreadId = thread.Id, ClassWorkspaceId = thread.ClassWorkspaceId });

        return Ok(new { Message = "Thread created successfully.", ThreadId = thread.Id });
    }

    // ─── 3. Get Thread Detail ────────────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetThreadDetail(Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var thread = await _context.DiscussionThreads
            .Include(t => t.Author)
            .Include(t => t.ClassWorkspace)
            .Include(t => t.Attachments)
            .Include(t => t.Replies.Where(r => !r.IsDeleted))
                .ThenInclude(r => r.Author)
            .Include(t => t.Replies.Where(r => !r.IsDeleted))
                .ThenInclude(r => r.Attachments)
            .Include(t => t.Replies.Where(r => !r.IsDeleted))
                .ThenInclude(r => r.ParentReply)
                    .ThenInclude(pr => pr!.Author)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (thread == null) return NotFound(new { Message = "Thread not found." });

        var result = new
        {
            thread.Id,
            thread.ClassWorkspaceId,
            ClassName = thread.ClassWorkspace != null ? thread.ClassWorkspace.Name : "General",
            ClassCode = thread.ClassWorkspace != null ? thread.ClassWorkspace.Code : "",
            thread.Title,
            thread.Content,
            thread.Category,
            thread.IsPinned,
            thread.IsLocked,
            thread.RepliesCount,
            thread.LastActivityAt,
            thread.CreatedAt,
            Author = thread.Author != null ? new
            {
                thread.Author.Id,
                Name = $"{thread.Author.FirstName} {thread.Author.LastName}",
                Role = (int)thread.Author.Role,
                RoleName = thread.Author.Role.ToString(),
                AvatarText = $"{thread.Author.FirstName.Substring(0, 1)}{thread.Author.LastName.Substring(0, 1)}",
                thread.Author.ProfileImageUrl
            } : null,
            Attachments = thread.Attachments.Select(a => new
            {
                a.Id,
                a.FileName,
                a.FileUrl,
                a.FileType,
                a.FileSize
            }),
            Replies = thread.Replies.OrderBy(r => r.CreatedAt).Select(r => new
            {
                r.Id,
                r.Content,
                r.CreatedAt,
                r.ParentReplyId,
                ParentAuthorName = r.ParentReply != null && r.ParentReply.Author != null ? $"{r.ParentReply.Author.FirstName} {r.ParentReply.Author.LastName}" : null,
                ParentSnippet = r.ParentReply != null ? r.ParentReply.Content : null,
                Author = r.Author != null ? new
                {
                    r.Author.Id,
                    Name = $"{r.Author.FirstName} {r.Author.LastName}",
                    Role = (int)r.Author.Role,
                    RoleName = r.Author.Role.ToString(),
                    AvatarText = $"{r.Author.FirstName.Substring(0, 1)}{r.Author.LastName.Substring(0, 1)}",
                    r.Author.ProfileImageUrl
                } : null,
                Attachments = r.Attachments.Select(a => new
                {
                    a.Id,
                    a.FileName,
                    a.FileUrl,
                    a.FileType,
                    a.FileSize
                })
            })
        };

        return Ok(result);
    }

    // ─── 4. Create Reply ──────────────────────────────────────────────────────────
    [HttpPost("{id}/replies")]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> CreateReply(Guid id, [FromForm] CreateReplyForm form)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var thread = await _context.DiscussionThreads.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (thread == null) return NotFound(new { Message = "Thread not found." });

        if (thread.IsLocked && currentUser.Role != UserRole.Lecturer && currentUser.Role != UserRole.Administrator)
        {
            return BadRequest(new { Message = "This discussion has been locked by the lecturer. New replies are disabled." });
        }

        if (string.IsNullOrWhiteSpace(form.Content))
        {
            return BadRequest(new { Message = "Reply content is required." });
        }

        var reply = new DiscussionReply
        {
            DiscussionThreadId = thread.Id,
            AuthorId = currentUser.Id,
            Content = form.Content.Trim(),
            ParentReplyId = form.ParentReplyId,
            CreatedAt = DateTime.UtcNow
        };

        if (form.Files != null && form.Files.Count > 0)
        {
            foreach (var file in form.Files)
            {
                if (file.Length == 0) continue;
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                var safeName = $"discussions/replies/{Guid.NewGuid()}{ext}";
                using var stream = file.OpenReadStream();
                var fileUrl = await _storageService.UploadFileAsync(safeName, stream, "discussions");

                reply.Attachments.Add(new DiscussionAttachment
                {
                    FileName = file.FileName,
                    FileUrl = fileUrl,
                    FileType = ext.Replace(".", ""),
                    FileSize = file.Length,
                    UploadedAt = DateTime.UtcNow
                });
            }
        }

        _context.DiscussionReplies.Add(reply);

        thread.RepliesCount += 1;
        thread.LastActivityAt = DateTime.UtcNow;

        // Create notification for thread author if reply is from another user
        if (thread.AuthorId != currentUser.Id)
        {
            _context.Notifications.Add(new Notification
            {
                UserId = thread.AuthorId,
                Title = "New Discussion Reply",
                Message = $"{currentUser.FirstName} {currentUser.LastName} replied to your thread: \"{thread.Title}\"",
                Type = NotificationType.Message,
                ClassWorkspaceId = thread.ClassWorkspaceId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        // Broadcast SignalR real-time event
        await _hubContext.Clients.All.SendAsync("ReceiveDiscussionReply", new { ThreadId = thread.Id, ReplyId = reply.Id });

        return Ok(new { Message = "Reply added successfully.", ReplyId = reply.Id });
    }

    // ─── 5. Edit Reply ───────────────────────────────────────────────────────────
    [HttpPut("replies/{replyId}")]
    public async Task<IActionResult> EditReply(Guid replyId, [FromBody] EditReplyModel model)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var reply = await _context.DiscussionReplies.FirstOrDefaultAsync(r => r.Id == replyId && !r.IsDeleted);
        if (reply == null) return NotFound(new { Message = "Reply not found." });

        if (reply.AuthorId != currentUser.Id && currentUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        reply.Content = model.Content.Trim();
        reply.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Reply updated successfully." });
    }

    // ─── 6. Delete Reply ──────────────────────────────────────────────────────────
    [HttpDelete("replies/{replyId}")]
    public async Task<IActionResult> DeleteReply(Guid replyId)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var reply = await _context.DiscussionReplies
            .Include(r => r.Author)
            .Include(r => r.DiscussionThread)
            .FirstOrDefaultAsync(r => r.Id == replyId && !r.IsDeleted);

        if (reply == null) return NotFound(new { Message = "Reply not found." });

        bool isOwner = reply.AuthorId == currentUser.Id;
        bool isLecturerOrAdmin = currentUser.Role == UserRole.Lecturer || currentUser.Role == UserRole.Administrator;
        bool isCourseRep = currentUser.Role == UserRole.ClassRepresentative;

        bool authorIsLecturer = reply.Author != null && (reply.Author.Role == UserRole.Lecturer || reply.Author.Role == UserRole.Administrator);

        // Course Reps can moderate student/peer replies, but CANNOT delete a Lecturer's reply!
        if (!isOwner && !isLecturerOrAdmin)
        {
            if (!isCourseRep || authorIsLecturer)
            {
                return Forbid();
            }
        }

        reply.IsDeleted = true;
        if (reply.DiscussionThread != null && reply.DiscussionThread.RepliesCount > 0)
        {
            reply.DiscussionThread.RepliesCount -= 1;
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Reply deleted successfully." });
    }

    // ─── 7. Pin / Unpin Thread ───────────────────────────────────────────────────
    [HttpPut("{id}/pin")]
    [HttpPost("{id}/pin")]
    public async Task<IActionResult> TogglePin(Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var thread = await _context.DiscussionThreads.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (thread == null) return NotFound(new { Message = "Thread not found." });

        bool isStaff = currentUser.Role == UserRole.Lecturer || currentUser.Role == UserRole.ClassRepresentative || currentUser.Role == UserRole.Administrator;
        bool isAuthor = thread.AuthorId == currentUser.Id;

        if (!isStaff && !isAuthor)
        {
            return Forbid();
        }

        thread.IsPinned = !thread.IsPinned;
        thread.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = thread.IsPinned ? "Thread pinned." : "Thread unpinned.", isPinned = thread.IsPinned, IsPinned = thread.IsPinned });
    }

    // ─── 8. Lock / Unlock Thread ─────────────────────────────────────────────────
    [HttpPut("{id}/lock")]
    [HttpPost("{id}/lock")]
    public async Task<IActionResult> ToggleLock(Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var thread = await _context.DiscussionThreads.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (thread == null) return NotFound(new { Message = "Thread not found." });

        bool isStaff = currentUser.Role == UserRole.Lecturer || currentUser.Role == UserRole.ClassRepresentative || currentUser.Role == UserRole.Administrator;
        bool isAuthor = thread.AuthorId == currentUser.Id;

        if (!isStaff && !isAuthor)
        {
            return Forbid();
        }

        thread.IsLocked = !thread.IsLocked;
        thread.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = thread.IsLocked ? "Thread locked." : "Thread unlocked.", isLocked = thread.IsLocked, IsLocked = thread.IsLocked });
    }

    // ─── 9. Delete Thread ────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteThread(Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var thread = await _context.DiscussionThreads
            .Include(t => t.Author)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (thread == null) return NotFound(new { Message = "Thread not found." });

        bool isOwner = thread.AuthorId == currentUser.Id;
        bool isLecturerOrAdmin = currentUser.Role == UserRole.Lecturer || currentUser.Role == UserRole.Administrator;
        bool isCourseRep = currentUser.Role == UserRole.ClassRepresentative;

        bool authorIsLecturer = thread.Author != null && (thread.Author.Role == UserRole.Lecturer || thread.Author.Role == UserRole.Administrator);

        // Course Reps can moderate student/peer threads, but CANNOT delete a Lecturer's thread!
        if (!isOwner && !isLecturerOrAdmin)
        {
            if (!isCourseRep || authorIsLecturer)
            {
                return Forbid();
            }
        }

        thread.IsDeleted = true;
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Thread deleted successfully." });
    }
}

public class CreateThreadForm
{
    public Guid ClassWorkspaceId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public IFormFileCollection? Files { get; set; }
}

public class CreateReplyForm
{
    public string Content { get; set; } = string.Empty;
    public Guid? ParentReplyId { get; set; }
    public IFormFileCollection? Files { get; set; }
}

public class EditReplyModel
{
    public string Content { get; set; } = string.Empty;
}
