using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;
using System.Security.Claims;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookmarksController : ControllerBase
{
    private readonly D1Context _context;

    public BookmarksController(D1Context context)
    {
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyBookmarks()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var bookmarks = await _context.Bookmarks.QueryAsync(
            "WHERE lower(\"UserId\") = lower(?)",
            new object?[] { userId });

        var resultList = new List<object>();

        foreach (var bookmark in bookmarks)
        {
            if (bookmark.EntityType.Equals("Announcement", StringComparison.OrdinalIgnoreCase))
            {
                var item = await _context.Announcements.FindAsync(bookmark.EntityId);
                if (item != null && !item.IsDeleted)
                {
                    resultList.Add(new
                    {
                        bookmark.Id,
                        bookmark.EntityType,
                        bookmark.EntityId,
                        bookmark.CreatedAt,
                        Details = new
                        {
                            item.Title,
                            Description = item.Content,
                            item.PublishedAt,
                            item.IsVerified,
                            item.Status,
                            item.Tags
                        }
                    });
                }
            }
            else if (bookmark.EntityType.Equals("Assignment", StringComparison.OrdinalIgnoreCase))
            {
                var item = await _context.Assignments.FindAsync(bookmark.EntityId);
                if (item != null && !item.IsDeleted)
                {
                    resultList.Add(new
                    {
                        bookmark.Id,
                        bookmark.EntityType,
                        bookmark.EntityId,
                        bookmark.CreatedAt,
                        Details = new
                        {
                            item.Title,
                            item.Description,
                            item.DueDate,
                            item.MaxPoints,
                            item.Status
                        }
                    });
                }
            }
            else if (bookmark.EntityType.Equals("Resource", StringComparison.OrdinalIgnoreCase))
            {
                var item = await _context.LearningResources.FindAsync(bookmark.EntityId);
                if (item != null && !item.IsDeleted)
                {
                    resultList.Add(new
                    {
                        bookmark.Id,
                        bookmark.EntityType,
                        bookmark.EntityId,
                        bookmark.CreatedAt,
                        Details = new
                        {
                            item.Title,
                            item.Description,
                            item.FileUrl,
                            item.FileType,
                            item.FileSize,
                            item.Category
                        }
                    });
                }
            }
        }

        return Ok(resultList);
    }

    [HttpPost]
    public async Task<IActionResult> ToggleBookmark([FromBody] ToggleBookmarkModel model)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var existing = await _context.Bookmarks.QueryFirstOrDefaultAsync(
            "WHERE lower(\"UserId\") = lower(?) AND \"EntityType\" = ? AND lower(\"EntityId\") = lower(?)",
            new object?[] { userId, model.EntityType, model.EntityId });

        if (existing != null)
        {
            _context.Bookmarks.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(new { Bookmarked = false });
        }

        var newBookmark = new Bookmark
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EntityType = model.EntityType,
            EntityId = model.EntityId,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Bookmarks.AddAsync(newBookmark);

        // Log announcement engagement if bookmarked
        if (model.EntityType.Equals("Announcement", StringComparison.OrdinalIgnoreCase))
        {
            var engagement = new AnnouncementEngagement
            {
                Id = Guid.NewGuid(),
                AnnouncementId = model.EntityId,
                UserId = userId,
                ActionType = "Bookmark",
                CreatedAt = DateTime.UtcNow
            };
            await _context.AnnouncementEngagements.AddAsync(engagement);
        }

        await _context.SaveChangesAsync();
        return Ok(new { Bookmarked = true });
    }
}

public class ToggleBookmarkModel
{
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
}
