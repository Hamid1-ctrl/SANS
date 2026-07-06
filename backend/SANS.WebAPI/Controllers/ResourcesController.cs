using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResourcesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public ResourcesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var resources = await _unitOfWork.LearningResources.GetAllAsync();
        return Ok(resources.Where(r => !r.IsDeleted));
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

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateResourceModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

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
            DepartmentId = model.DepartmentId,
            UploadedByUserId = userId,
            DownloadCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.LearningResources.AddAsync(resource);
        await _unitOfWork.SaveChangesAsync();

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
}

public class UpdateResourceModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Tags { get; set; } = string.Empty;
}
