using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SANS.Application.Interfaces.Services;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Services.D1;
using SANS.WebAPI.Hubs;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[DisableRequestSizeLimit]
public class DiscussionsController : ControllerBase
{
    private readonly D1Context _context;
    private readonly IStorageService _storageService;
    private readonly IHubContext<NotificationHub> _hubContext;

    public DiscussionsController(D1Context context, IStorageService storageService, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _storageService = storageService;
        _hubContext = hubContext;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var firebaseUid = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(firebaseUid)) return null;

        var user = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"FirebaseUid\") = lower(?)",
            new object?[] { firebaseUid });

        if (user == null && Guid.TryParse(firebaseUid, out var parsedGuid))
        {
            user = await _context.Users.QueryFirstOrDefaultAsync(
                "WHERE \"IsDeleted\" = 0 AND lower(\"Id\") = lower(?)",
                new object?[] { parsedGuid });
        }

        return user;
    }

    // ─── Bulk-load helpers (navigation property replacement) ─────────────────────
    private async Task<Dictionary<Guid, User>> LoadUsersByIdsAsync(List<Guid> ids)
    {
        var map = new Dictionary<Guid, User>();
        if (ids.Count == 0) return map;
        var inClause = string.Join(", ", ids.Select(_ => "lower(?)"));
        var users = await _context.Users.QueryAsync($"WHERE lower(\"Id\") IN ({inClause})", ids.Cast<object?>().ToArray());
        foreach (var u in users) map[u.Id] = u;
        return map;
    }

    private async Task<Dictionary<Guid, ClassWorkspace>> LoadClassesByIdsAsync(List<Guid> ids)
    {
        var map = new Dictionary<Guid, ClassWorkspace>();
        if (ids.Count == 0) return map;
        var inClause = string.Join(", ", ids.Select(_ => "lower(?)"));
        var classes = await _context.ClassWorkspaces.QueryAsync($"WHERE lower(\"Id\") IN ({inClause})", ids.Cast<object?>().ToArray());
        foreach (var c in classes) map[c.Id] = c;
        return map;
    }

    private async Task<Dictionary<Guid, List<DiscussionAttachment>>> LoadThreadAttachmentsAsync(List<Guid> threadIds)
    {
        var map = new Dictionary<Guid, List<DiscussionAttachment>>();
        if (threadIds.Count == 0) return map;
        var inClause = string.Join(", ", threadIds.Select(_ => "lower(?)"));
        var attachments = await _context.DiscussionAttachments.QueryAsync(
            $"WHERE lower(\"DiscussionThreadId\") IN ({inClause})",
            threadIds.Cast<object?>().ToArray());
        foreach (var a in attachments)
        {
            if (!a.DiscussionThreadId.HasValue) continue;
            if (!map.TryGetValue(a.DiscussionThreadId.Value, out var list))
            {
                list = new List<DiscussionAttachment>();
                map[a.DiscussionThreadId.Value] = list;
            }
            list.Add(a);
        }
        return map;
    }

    private async Task<Dictionary<Guid, List<DiscussionAttachment>>> LoadReplyAttachmentsAsync(List<Guid> replyIds)
    {
        var map = new Dictionary<Guid, List<DiscussionAttachment>>();
        if (replyIds.Count == 0) return map;
        var inClause = string.Join(", ", replyIds.Select(_ => "lower(?)"));
        var attachments = await _context.DiscussionAttachments.QueryAsync(
            $"WHERE lower(\"DiscussionReplyId\") IN ({inClause})",
            replyIds.Cast<object?>().ToArray());
        foreach (var a in attachments)
        {
            if (!a.DiscussionReplyId.HasValue) continue;
            if (!map.TryGetValue(a.DiscussionReplyId.Value, out var list))
            {
                list = new List<DiscussionAttachment>();
                map[a.DiscussionReplyId.Value] = list;
            }
            list.Add(a);
        }
        return map;
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

        var threads = await _context.DiscussionThreads.QueryAsync("WHERE \"IsDeleted\" = 0");

        if (classWorkspaceId.HasValue && classWorkspaceId.Value != Guid.Empty)
        {
            // Admins and Lecturers can always view any class discussions
            bool canAccess = currentUser.Role == UserRole.Administrator || currentUser.Role == UserRole.Lecturer ||
                             await _context.IsUserAuthorizedForClassAsync(classWorkspaceId.Value, currentUser.Id);
            if (!canAccess)
            {
                return StatusCode(403, new { Message = "Access denied. You are not enrolled in this class workspace." });
            }

            threads = threads.Where(t => t.ClassWorkspaceId == classWorkspaceId.Value).ToList();
        }
        else if (currentUser.Role == UserRole.Student || currentUser.Role == UserRole.ClassRepresentative)
        {
            // Only show threads for classes the student/rep is enrolled in
            var enrolledClassIds = (await _context.QueryRowsAsync(
                "SELECT ce.\"EnrolledClassesId\" FROM \"ClassEnrollments\" ce WHERE lower(ce.\"StudentsId\") = lower(?)",
                new object?[] { currentUser.Id }))
                .Select(r => D1ValueConverter.ParseGuid(r.TryGetValue("EnrolledClassesId", out var v) ? v : null))
                .ToList();

            threads = threads.Where(t => enrolledClassIds.Contains(t.ClassWorkspaceId)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            threads = threads.Where(t => t.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            threads = threads.Where(t => t.Title.ToLower().Contains(term) || t.Content.ToLower().Contains(term)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(filter))
        {
            switch (filter.ToLower())
            {
                case "pinned":
                    threads = threads.Where(t => t.IsPinned).ToList();
                    break;
                case "unanswered":
                    threads = threads.Where(t => t.RepliesCount == 0).ToList();
                    break;
                case "newest":
                    threads = threads.OrderByDescending(t => t.CreatedAt).ToList();
                    break;
                default:
                    break;
            }
        }

        if (string.IsNullOrWhiteSpace(filter) || filter.ToLower() != "newest")
        {
            threads = threads.OrderByDescending(t => t.IsPinned)
                             .ThenByDescending(t => t.LastActivityAt)
                             .ToList();
        }

        // Load related data
        var authorMap = await LoadUsersByIdsAsync(threads.Select(t => t.AuthorId).Distinct().ToList());
        var classMap = await LoadClassesByIdsAsync(threads.Select(t => t.ClassWorkspaceId).Distinct().ToList());
        var attachmentMap = await LoadThreadAttachmentsAsync(threads.Select(t => t.Id).ToList());

        var result = threads.Select(t =>
        {
            authorMap.TryGetValue(t.AuthorId, out var author);
            classMap.TryGetValue(t.ClassWorkspaceId, out var classWorkspace);
            t.Author = author;
            t.ClassWorkspace = classWorkspace;
            t.Attachments = attachmentMap.TryGetValue(t.Id, out var attachments) ? attachments : new List<DiscussionAttachment>();

            return new
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
            };
        }).ToList();

        return Ok(result);
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
            Id = Guid.NewGuid(),
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
                    Id = Guid.NewGuid(),
                    DiscussionThreadId = thread.Id,
                    FileName = file.FileName,
                    FileUrl = fileUrl,
                    FileType = ext.Replace(".", ""),
                    FileSize = file.Length,
                    UploadedAt = DateTime.UtcNow
                });
            }
        }

        _context.DiscussionThreads.Add(thread);
        foreach (var attachment in thread.Attachments)
        {
            _context.DiscussionAttachments.Add(attachment);
        }
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

        var thread = await _context.DiscussionThreads.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });

        if (thread == null) return NotFound(new { Message = "Thread not found." });

        // Load related data
        var author = await _context.Users.FindAsync(thread.AuthorId);
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(thread.ClassWorkspaceId);
        thread.Author = author;
        thread.ClassWorkspace = classWorkspace;

        var threadAttachments = await _context.DiscussionAttachments.QueryAsync(
            "WHERE lower(\"DiscussionThreadId\") = lower(?)",
            new object?[] { thread.Id });
        thread.Attachments = threadAttachments;

        var replies = await _context.DiscussionReplies.QueryAsync(
            "WHERE lower(\"DiscussionThreadId\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { thread.Id });

        var replyAuthorMap = await LoadUsersByIdsAsync(replies.Select(r => r.AuthorId).Distinct().ToList());
        var replyAttachmentMap = await LoadReplyAttachmentsAsync(replies.Select(r => r.Id).ToList());

        // Load parent replies (for quoted/threaded replies)
        var parentReplyIds = replies.Where(r => r.ParentReplyId.HasValue).Select(r => r.ParentReplyId!.Value).Distinct().ToList();
        var parentReplies = new Dictionary<Guid, DiscussionReply>();
        if (parentReplyIds.Count > 0)
        {
            var inClause = string.Join(", ", parentReplyIds.Select(_ => "lower(?)"));
            var parents = await _context.DiscussionReplies.QueryAsync(
                $"WHERE lower(\"Id\") IN ({inClause})",
                parentReplyIds.Cast<object?>().ToArray());
            var parentAuthorMap = await LoadUsersByIdsAsync(parents.Select(p => p.AuthorId).Distinct().ToList());
            foreach (var p in parents)
            {
                if (parentAuthorMap.TryGetValue(p.AuthorId, out var parentAuthor)) p.Author = parentAuthor;
                parentReplies[p.Id] = p;
            }
        }

        foreach (var r in replies)
        {
            if (replyAuthorMap.TryGetValue(r.AuthorId, out var replyAuthor)) r.Author = replyAuthor;
            if (replyAttachmentMap.TryGetValue(r.Id, out var rAttachments)) r.Attachments = rAttachments;

            if (r.ParentReplyId.HasValue)
            {
                if (parentReplies.TryGetValue(r.ParentReplyId.Value, out var parentReply))
                {
                    r.ParentReply = parentReply;
                }
            }
        }
        thread.Replies = replies;

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

        var thread = await _context.DiscussionThreads.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });
        if (thread == null) return NotFound(new { Message = "Thread not found." });

        // Only block replies if thread is locked (staff can still reply)
        if (thread.IsLocked && currentUser.Role != UserRole.Lecturer && currentUser.Role != UserRole.Administrator && currentUser.Role != UserRole.ClassRepresentative)
        {
            return BadRequest(new { Message = "This discussion is locked and no longer accepts replies." });
        }

        if (string.IsNullOrWhiteSpace(form.Content))
        {
            return BadRequest(new { Message = "Reply content is required." });
        }

        Guid? parentReplyId = !string.IsNullOrWhiteSpace(form.ParentReplyId) && Guid.TryParse(form.ParentReplyId, out var pId) ? pId : null;

        var reply = new DiscussionReply
        {
            Id = Guid.NewGuid(),
            DiscussionThreadId = thread.Id,
            AuthorId = currentUser.Id,
            Content = form.Content.Trim(),
            ParentReplyId = parentReplyId,
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
                    Id = Guid.NewGuid(),
                    DiscussionReplyId = reply.Id,
                    FileName = file.FileName,
                    FileUrl = fileUrl,
                    FileType = ext.Replace(".", ""),
                    FileSize = file.Length,
                    UploadedAt = DateTime.UtcNow
                });
            }
        }

        _context.DiscussionReplies.Add(reply);
        foreach (var attachment in reply.Attachments)
        {
            _context.DiscussionAttachments.Add(attachment);
        }

        thread.RepliesCount += 1;
        thread.LastActivityAt = DateTime.UtcNow;
        _context.DiscussionThreads.Update(thread);

        // Create notification for thread author if reply is from another user
        if (thread.AuthorId != currentUser.Id)
        {
            _context.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
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

        var reply = await _context.DiscussionReplies.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { replyId });
        if (reply == null) return NotFound(new { Message = "Reply not found." });

        if (reply.AuthorId != currentUser.Id && currentUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        reply.Content = model.Content.Trim();
        reply.UpdatedAt = DateTime.UtcNow;
        _context.DiscussionReplies.Update(reply);

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Reply updated successfully." });
    }

    // ─── 6. Delete Reply ──────────────────────────────────────────────────────────
    [HttpDelete("replies/{replyId}")]
    public async Task<IActionResult> DeleteReply(Guid replyId)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var reply = await _context.DiscussionReplies.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { replyId });

        if (reply == null) return NotFound(new { Message = "Reply not found." });

        var author = await _context.Users.FindAsync(reply.AuthorId);
        var thread = reply.DiscussionThreadId != Guid.Empty
            ? await _context.DiscussionThreads.FindAsync(reply.DiscussionThreadId)
            : null;

        bool isOwner = reply.AuthorId == currentUser.Id;
        bool isLecturerOrAdmin = currentUser.Role == UserRole.Lecturer || currentUser.Role == UserRole.Administrator;
        bool isCourseRep = currentUser.Role == UserRole.ClassRepresentative;

        bool authorIsLecturer = author != null && (author.Role == UserRole.Lecturer || author.Role == UserRole.Administrator);

        // Course Reps can moderate student/peer replies, but CANNOT delete a Lecturer's reply!
        if (!isOwner && !isLecturerOrAdmin)
        {
            if (!isCourseRep || authorIsLecturer)
            {
                return Forbid();
            }
        }

        reply.IsDeleted = true;
        _context.DiscussionReplies.Update(reply);

        if (thread != null && thread.RepliesCount > 0)
        {
            thread.RepliesCount -= 1;
            _context.DiscussionThreads.Update(thread);
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Reply deleted successfully." });
    }

    // ─── 7. Pin / Unpin Thread ───────────────────────────────────────────────────
    [HttpPost("{id}/pin")]
    [HttpPut("{id}/pin")]
    [HttpPatch("{id}/pin")]
    public async Task<IActionResult> TogglePin([FromRoute] Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var thread = await _context.DiscussionThreads.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });
        if (thread == null) return NotFound(new { Message = "Thread not found." });

        bool isStaff = currentUser.Role == UserRole.Lecturer || currentUser.Role == UserRole.ClassRepresentative || currentUser.Role == UserRole.Administrator;
        bool isAuthor = thread.AuthorId == currentUser.Id;

        if (!isStaff && !isAuthor)
            return Forbid();

        thread.IsPinned = !thread.IsPinned;
        thread.UpdatedAt = DateTime.UtcNow;
        _context.DiscussionThreads.Update(thread);
        await _context.SaveChangesAsync();

        return Ok(new { Message = thread.IsPinned ? "Thread pinned." : "Thread unpinned.", isPinned = thread.IsPinned, IsPinned = thread.IsPinned });
    }

    // ─── 8. Lock / Unlock Thread ─────────────────────────────────────────────────
    [HttpPost("{id}/lock")]
    [HttpPut("{id}/lock")]
    [HttpPatch("{id}/lock")]
    public async Task<IActionResult> ToggleLock([FromRoute] Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var thread = await _context.DiscussionThreads.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });
        if (thread == null) return NotFound(new { Message = "Thread not found." });

        bool isStaff = currentUser.Role == UserRole.Lecturer || currentUser.Role == UserRole.ClassRepresentative || currentUser.Role == UserRole.Administrator;
        bool isAuthor = thread.AuthorId == currentUser.Id;

        if (!isStaff && !isAuthor)
            return Forbid();

        thread.IsLocked = !thread.IsLocked;
        thread.UpdatedAt = DateTime.UtcNow;
        _context.DiscussionThreads.Update(thread);
        await _context.SaveChangesAsync();

        return Ok(new { Message = thread.IsLocked ? "Thread locked." : "Thread unlocked.", isLocked = thread.IsLocked, IsLocked = thread.IsLocked });
    }

    // ─── 9. Delete Thread ────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteThread([FromRoute] Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { Message = "User not authenticated." });

        var thread = await _context.DiscussionThreads.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });

        if (thread == null) return NotFound(new { Message = "Thread not found." });

        var author = await _context.Users.FindAsync(thread.AuthorId);

        bool isOwner = thread.AuthorId == currentUser.Id;
        bool isLecturerOrAdmin = currentUser.Role == UserRole.Lecturer || currentUser.Role == UserRole.Administrator;
        bool isCourseRep = currentUser.Role == UserRole.ClassRepresentative;

        bool authorIsLecturer = author != null && (author.Role == UserRole.Lecturer || author.Role == UserRole.Administrator);

        // Course Reps can moderate student/peer threads, but CANNOT delete a Lecturer's thread!
        if (!isOwner && !isLecturerOrAdmin)
        {
            if (!isCourseRep || authorIsLecturer)
            {
                return Forbid();
            }
        }

        thread.IsDeleted = true;
        _context.DiscussionThreads.Update(thread);
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
    public string? ParentReplyId { get; set; }
    public IFormFileCollection? Files { get; set; }
}

public class EditReplyModel
{
    public string Content { get; set; } = string.Empty;
}
