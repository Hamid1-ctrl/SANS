using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;
using SANS.Application.Interfaces.Services;
using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IStorageService _storageService;

    public UsersController(AppDbContext context, IStorageService storageService)
    {
        _context = context;
        _storageService = storageService;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim.Value, out var userId))
            return null;
        return await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
    }

    [HttpGet("lecturers/pending")]
    public async Task<IActionResult> GetPendingLecturers()
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || currentUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        var pending = await _context.Users
            .Where(u => u.Role == UserRole.Lecturer && u.Status == AccountStatus.Pending && !u.IsDeleted)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.PhoneNumber,
                u.StudentId,
                u.OfficeNumber,
                u.OfficeHours,
                u.Specialization,
                Role = (int)u.Role,
                Status = (int)u.Status,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(pending);
    }

    [HttpGet("lecturers")]
    public async Task<IActionResult> GetAllLecturers()
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || currentUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        var lecturers = await _context.Users
            .Where(u => u.Role == UserRole.Lecturer && !u.IsDeleted)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.PhoneNumber,
                u.StudentId,
                u.OfficeNumber,
                u.OfficeHours,
                u.Specialization,
                Role = (int)u.Role,
                Status = (int)u.Status,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(lecturers);
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveLecturer(Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || currentUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (targetUser == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        targetUser.Status = AccountStatus.Verified;
        targetUser.IsActive = true;
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Lecturer approved successfully.", Status = (int)targetUser.Status });
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectLecturer(Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || currentUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (targetUser == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        targetUser.Status = AccountStatus.Rejected;
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Lecturer registration rejected.", Status = (int)targetUser.Status });
    }

    [HttpPost("{id}/suspend")]
    public async Task<IActionResult> SuspendLecturer(Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || currentUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (targetUser == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        targetUser.Status = AccountStatus.Suspended;
        targetUser.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Lecturer suspended successfully.", Status = (int)targetUser.Status });
    }

    [HttpPost("{id}/unsuspend")]
    public async Task<IActionResult> UnsuspendLecturer(Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || currentUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (targetUser == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        targetUser.Status = AccountStatus.Verified;
        targetUser.IsActive = true;
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Lecturer suspension lifted successfully.", Status = (int)targetUser.Status });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileModel model)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null)
        {
            return Unauthorized(new { Message = "User not logged in." });
        }

        currentUser.FirstName = model.FirstName;
        currentUser.LastName = model.LastName;
        currentUser.PhoneNumber = model.PhoneNumber;
        currentUser.OfficeNumber = model.OfficeNumber;
        currentUser.OfficeHours = model.OfficeHours;
        currentUser.Specialization = model.Specialization;
        currentUser.Bio = model.Bio;
        currentUser.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            currentUser.Id,
            currentUser.FirstName,
            currentUser.LastName,
            currentUser.Email,
            currentUser.PhoneNumber,
            currentUser.StudentId,
            Role = (int)currentUser.Role,
            Status = (int)currentUser.Status,
            currentUser.IsActive,
            currentUser.DepartmentId,
            currentUser.ProfileImageUrl,
            currentUser.LastLoginAt,
            currentUser.CreatedAt,
            currentUser.OfficeNumber,
            currentUser.OfficeHours,
            currentUser.Specialization,
            currentUser.Bio
        });
    }

    [HttpPost("profile-image")]
    [RequestSizeLimit(10_485_760)] // 10 MB limit
    public async Task<IActionResult> UploadProfileImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { Message = "No file provided" });

        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null)
            return Unauthorized(new { Message = "User not logged in." });

        try
        {
            var extension = Path.GetExtension(file.FileName);
            var safeFileName = $"profiles/{Guid.NewGuid()}{extension}";

            using var stream = file.OpenReadStream();
            var fileUrl = await _storageService.UploadFileAsync(safeFileName, stream, "profiles");

            currentUser.ProfileImageUrl = fileUrl;
            currentUser.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { ProfileImageUrl = fileUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "Profile image upload failed", Detail = ex.Message });
        }
    }
}

public class UpdateProfileModel
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? OfficeNumber { get; set; }
    public string? OfficeHours { get; set; }
    public string? Specialization { get; set; }
    public string? Bio { get; set; }
}
