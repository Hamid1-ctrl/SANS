using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Application.Interfaces.Services;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResourcesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly SANS.Infrastructure.Data.AppDbContext _context;
    private readonly IStorageService _storageService;

    public ResourcesController(IUnitOfWork unitOfWork, SANS.Infrastructure.Data.AppDbContext context, IStorageService storageService)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _storageService = storageService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        var query = _context.LearningResources.Where(r => !r.IsDeleted);

        if (classId.HasValue)
        {
            query = query.Where(r => r.ClassWorkspaceId == classId.Value);
        }
        else
        {
            if (dbUser.Role == UserRole.Lecturer)
            {
                query = query.Where(r => r.ClassWorkspace != null && r.ClassWorkspace.LecturerId == userId);
            }
            else
            {
                query = query.Where(r => r.ClassWorkspace != null && r.ClassWorkspace.Students.Any(s => s.Id == userId));
            }
        }

        var list = await query.ToListAsync();
        return Ok(list);
    }

    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        var resources = await _unitOfWork.LearningResources.GetByDepartmentAsync(departmentId);
        return Ok(resources.Where(r => !r.IsDeleted));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var resource = await _unitOfWork.LearningResources.GetByIdAsync(id);
        if (resource == null || resource.IsDeleted)
        {
            return NotFound(new { Message = "Resource not found" });
        }

        // Increment download count
        resource.DownloadCount++;
        await _unitOfWork.LearningResources.UpdateAsync(resource);
        await _unitOfWork.SaveChangesAsync();

        return Ok(resource);
    }

    // ─── Real File Upload (multipart/form-data) → Cloudflare R2 ───────────────
    [HttpPost("upload")]
    [RequestSizeLimit(52_428_800)] // 50 MB
    public async Task<IActionResult> Upload([FromForm] UploadResourceModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
            return Unauthorized();

        if (model.File == null || model.File.Length == 0)
            return BadRequest(new { Message = "No file provided." });

        // Sanitize filename and build a unique storage key
        var ext = Path.GetExtension(model.File.FileName);
        var safeName = $"{Guid.NewGuid()}{ext}";
        var folder = "resources";

        string fileUrl;
        try
        {
            await using var stream = model.File.OpenReadStream();
            fileUrl = await _storageService.UploadFileAsync(safeName, stream, folder);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = $"R2 upload failed: {ex.Message}" });
        }

        // Safely resolve DepartmentId to avoid DB foreign key constraint errors
        var resolvedDeptId = await GetDepartmentIdAsync(model.DepartmentId, userId);

        var resource = new LearningResource
        {
            Id = Guid.NewGuid(),
            Title = string.IsNullOrWhiteSpace(model.Title)
                ? Path.GetFileNameWithoutExtension(model.File.FileName)
                : model.Title,
            Description = model.Description ?? "Uploaded via SANS resources manager.",
            FileUrl = fileUrl,
            FileType = ext.TrimStart('.').ToUpperInvariant(),
            FileSize = model.File.Length,
            Category = model.Category ?? "Document",
            Tags = model.Tags ?? string.Empty,
            DepartmentId = resolvedDeptId,
            UploadedByUserId = userId,
            DownloadCount = 0,
            ClassWorkspaceId = model.ClassWorkspaceId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.LearningResources.AddAsync(resource);

        // Notify students in the class
        if (model.ClassWorkspaceId.HasValue)
        {
            var classWorkspace = await _context.ClassWorkspaces
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == model.ClassWorkspaceId.Value && !c.IsDeleted);

            if (classWorkspace != null)
            {
                foreach (var student in classWorkspace.Students)
                {
                    await _context.Notifications.AddAsync(new Notification
                    {
                        Id = Guid.NewGuid(),
                        Title = "New Resource Uploaded",
                        Message = $"'{resource.Title}' ({resource.FileType}) has been shared in {classWorkspace.Name}.",
                        Type = NotificationType.Alert,
                        Priority = NotificationPriority.Normal,
                        IsRead = false,
                        UserId = student.Id,
                        ClassWorkspaceId = classWorkspace.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = resource.Id }, new
        {
            resource.Id,
            resource.Title,
            resource.FileUrl,
            resource.FileType,
            resource.FileSize,
            resource.CreatedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateResourceModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var resolvedDeptId = await GetDepartmentIdAsync(model.DepartmentId, userId);

        var resource = new LearningResource
        {
            Id = Guid.NewGuid(),
            Title = model.Title,
            Description = model.Description,
            FileUrl = model.FileUrl,
            FileType = model.FileType,
            FileSize = model.FileSize,
            Category = model.Category,
            Tags = model.Tags,
            DepartmentId = resolvedDeptId,
            UploadedByUserId = userId,
            DownloadCount = 0,
            ClassWorkspaceId = model.ClassWorkspaceId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.LearningResources.AddAsync(resource);

        if (model.ClassWorkspaceId.HasValue)
        {
            var classWorkspace = await _context.ClassWorkspaces
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == model.ClassWorkspaceId.Value && !c.IsDeleted);

            if (classWorkspace != null)
            {
                foreach (var student in classWorkspace.Students)
                {
                    var notification = new Notification
                    {
                        Id = Guid.NewGuid(),
                        Title = "New Resource Uploaded",
                        Message = $"A new resource file '{model.Title}' ({model.FileType}) has been shared in {classWorkspace.Name}.",
                        Type = NotificationType.Alert,
                        Priority = NotificationPriority.Normal,
                        IsRead = false,
                        UserId = student.Id,
                        ClassWorkspaceId = classWorkspace.Id,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.Notifications.AddAsync(notification);
                }
            }
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = resource.Id }, resource);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateResourceModel model)
    {
        var resource = await _unitOfWork.LearningResources.GetByIdAsync(id);
        if (resource == null || resource.IsDeleted)
        {
            return NotFound(new { Message = "Resource not found" });
        }

        resource.Title = model.Title;
        resource.Description = model.Description;
        resource.Category = model.Category;
        resource.Tags = model.Tags;
        resource.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.LearningResources.UpdateAsync(resource);
        await _unitOfWork.SaveChangesAsync();

        return Ok(resource);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var resource = await _unitOfWork.LearningResources.GetByIdAsync(id);
        if (resource == null || resource.IsDeleted)
        {
            return NotFound(new { Message = "Resource not found" });
        }

        resource.IsDeleted = true;
        resource.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.LearningResources.UpdateAsync(resource);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "Resource deleted successfully" });
    }

    private async Task<Guid> GetDepartmentIdAsync(Guid? modelDeptId, Guid userId)
    {
        if (modelDeptId.HasValue && modelDeptId.Value != Guid.Empty)
        {
            return modelDeptId.Value;
        }

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser?.DepartmentId.HasValue == true && dbUser.DepartmentId.Value != Guid.Empty)
        {
            return dbUser.DepartmentId.Value;
        }

        var firstDept = await _context.Departments.FirstOrDefaultAsync();
        if (firstDept != null)
        {
            return firstDept.Id;
        }

        return Guid.Parse("11111111-1111-1111-1111-111111111111");
    }
}

public class CreateResourceModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Tags { get; set; } = string.Empty;
    public Guid DepartmentId { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
}

public class UpdateResourceModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Tags { get; set; } = string.Empty;
}

// Model for real multipart/form-data file upload → Cloudflare R2
public class UploadResourceModel
{
    public IFormFile? File { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Tags { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
}
