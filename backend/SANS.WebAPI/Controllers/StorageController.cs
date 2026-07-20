using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SANS.Application.Interfaces.Services;
using System.Security.Claims;

namespace SANS.WebAPI.Controllers;

/// <summary>
/// Dedicated file storage endpoint that uploads files to R2 and returns only the URL.
/// Does NOT create any database records — use this for assignment attachments.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StorageController : ControllerBase
{
    private readonly IStorageService _storageService;

    public StorageController(IStorageService storageService)
    {
        _storageService = storageService;
    }

    /// <summary>
    /// Upload a file for assignment attachment. Returns URL, fileName, fileSize.
    /// No LearningResource record is created.
    /// </summary>
    [HttpPost("upload-attachment")]
    [RequestSizeLimit(52_428_800)] // 50 MB
    public async Task<IActionResult> UploadAttachment(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { Message = "No file provided" });

        if (file.Length > 52_428_800)
            return BadRequest(new { Message = "File exceeds 50 MB limit" });

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        try
        {
            var extension = Path.GetExtension(file.FileName);
            var safeFileName = $"assignments/{Guid.NewGuid()}{extension}";

            using var stream = file.OpenReadStream();
            var fileUrl = await _storageService.UploadFileAsync(safeFileName, stream, "assignments");

            return Ok(new
            {
                FileUrl = fileUrl,
                FileName = file.FileName,
                FileSize = file.Length,
                FileType = file.ContentType,
                Extension = extension.TrimStart('.').ToLowerInvariant()
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "File upload failed", Detail = ex.Message });
        }
    }
}
