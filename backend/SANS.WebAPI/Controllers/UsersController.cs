using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Services.D1;
using SANS.Application.Interfaces.Services;
using System.Security.Claims;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly D1Context _context;
    private readonly IStorageService _storageService;

    public UsersController(D1Context context, IStorageService storageService)
    {
        _context = context;
        _storageService = storageService;
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim.Value, out var userId))
            return null;
        return await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Id\") = lower(?)",
            new object?[] { userId });
    }

    [HttpGet("lecturers/pending")]
    public async Task<IActionResult> GetPendingLecturers()
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || currentUser.Role != UserRole.Administrator)
        {
            return Forbid();
        }

        var users = await _context.Users.QueryAsync(
            "WHERE \"Role\" = 1 AND \"Status\" = 0 AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC");

        var pending = users.Select(u => new
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
        }).ToList();

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

        var users = await _context.Users.QueryAsync(
            "WHERE \"Role\" = 1 AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC");

        var lecturers = users.Select(u => new
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
        }).ToList();

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

        var targetUser = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Id\") = lower(?)",
            new object?[] { id });
        if (targetUser == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        targetUser.Status = AccountStatus.Verified;
        targetUser.IsActive = true;
        _context.Users.Update(targetUser);
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

        var targetUser = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Id\") = lower(?)",
            new object?[] { id });
        if (targetUser == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        targetUser.Status = AccountStatus.Rejected;
        _context.Users.Update(targetUser);
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

        var targetUser = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Id\") = lower(?)",
            new object?[] { id });
        if (targetUser == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        targetUser.Status = AccountStatus.Suspended;
        targetUser.IsActive = false;
        _context.Users.Update(targetUser);
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

        var targetUser = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Id\") = lower(?)",
            new object?[] { id });
        if (targetUser == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        targetUser.Status = AccountStatus.Verified;
        targetUser.IsActive = true;
        _context.Users.Update(targetUser);
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

        _context.Users.Update(currentUser);
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
            _context.Users.Update(currentUser);
            await _context.SaveChangesAsync();

            return Ok(new { ProfileImageUrl = fileUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "Profile image upload failed", Detail = ex.Message });
        }
    }

    [HttpDelete("profile-image")]
    public async Task<IActionResult> DeleteProfileImage()
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null)
            return Unauthorized(new { Message = "User not logged in." });

        currentUser.ProfileImageUrl = null;
        currentUser.UpdatedAt = DateTime.UtcNow;
        _context.Users.Update(currentUser);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Profile picture deleted successfully." });
    }

    [HttpGet("students/{id}")]
    public async Task<IActionResult> GetStudentDetails(Guid id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || (currentUser.Role != UserRole.Lecturer && currentUser.Role != UserRole.Administrator))
        {
            return Forbid();
        }

        var student = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Id\") = lower(?)",
            new object?[] { id });

        if (student == null)
        {
            return NotFound(new { Message = "Student profile not found." });
        }

        // Load Department navigation
        Department? department = null;
        if (student.DepartmentId.HasValue)
        {
            department = await _context.Departments.FindAsync(student.DepartmentId.Value);
        }

        // Load EnrolledClasses navigation
        var enrolledClassIds = await _context.GetEnrolledClassIdsAsync(student.Id);
        var enrolledClasses = new List<ClassWorkspace>();
        if (enrolledClassIds.Count > 0)
        {
            var inClause = string.Join(", ", enrolledClassIds.Select(_ => "lower(?)"));
            enrolledClasses = await _context.ClassWorkspaces.QueryAsync(
                $"WHERE lower(\"Id\") IN ({inClause})",
                enrolledClassIds.Cast<object?>().ToArray());
        }

        return Ok(new
        {
            student.Id,
            student.FirstName,
            student.LastName,
            student.Email,
            student.PhoneNumber,
            student.StudentId,
            student.IndexNumber,
            Role = (int)student.Role,
            Status = (int)student.Status,
            student.IsActive,
            student.DepartmentId,
            DepartmentName = department?.Name ?? student.DepartmentName,
            student.ProfileImageUrl,
            student.LastLoginAt,
            student.CreatedAt,
            EnrolledClasses = enrolledClasses.Select(c => new { c.Id, c.Code, c.Name })
        });
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
