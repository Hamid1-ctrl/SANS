using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SANS.Application.Interfaces.Services;
using SANS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpGet("test-db")]
    [AllowAnonymous]
    public async Task<IActionResult> TestDb()
    {
        var db = HttpContext.RequestServices.GetRequiredService<SANS.Infrastructure.Data.AppDbContext>();
        var depts = await db.Departments.Select(d => new { d.Id, d.Name }).ToListAsync();
        var classes = await db.ClassWorkspaces.Select(c => new { c.Id, c.Name, c.LecturerId }).ToListAsync();
        var users = await db.Users.Select(u => new { u.Id, u.FirstName, u.Email, u.Role, u.DepartmentId }).ToListAsync();
        return Ok(new { depts, classes, users });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterModel model)
    {
        if (model.Role == 2) // UserRole.ClassRepresentative
        {
            return BadRequest(new { Message = "Registration as a Course Representative is not permitted. Please register as a Student first." });
        }

        try
        {
            var (accessToken, refreshToken, user) = await _authService.RegisterAsync(
                model.Email,
                model.Password,
                model.FirstName,
                model.LastName,
                model.StudentId,
                model.PhoneNumber,
                model.Role,
                model.OfficeNumber,
                model.OfficeHours,
                model.Specialization,
                model.FirebaseUid);

            return Ok(new
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = MapToUserDto(user)
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "An error occurred during registration." });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginModel model)
    {
        try
        {
            var (accessToken, refreshToken, user) = await _authService.LoginAsync(model.Email, model.Password);

            return Ok(new
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = MapToUserDto(user)
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { Message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "An error occurred during login." });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenModel model)
    {
        try
        {
            var (accessToken, refreshToken) = await _authService.RefreshTokenAsync(model.RefreshToken);

            return Ok(new
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { Message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "An error occurred during token refresh." });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenModel model)
    {
        try
        {
            await _authService.LogoutAsync(model.RefreshToken);
            return Ok(new { Message = "Logged out successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "An error occurred during logout." });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
            {
                return Unauthorized(new { Message = "User token is invalid." });
            }

            var user = await _authService.GetUserByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { Message = "User not found." });
            }

            return Ok(MapToUserDto(user));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "An error occurred while fetching user data." });
        }
    }

    private object MapToUserDto(User user)
    {
        return new
        {
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.PhoneNumber,
            user.StudentId,
            Role = (int)user.Role,
            Status = (int)user.Status,
            user.IsActive,
            user.DepartmentId,
            user.ProfileImageUrl,
            user.LastLoginAt,
            user.CreatedAt,
            user.OfficeNumber,
            user.OfficeHours,
            user.Specialization
        };
    }
}

public class RegisterModel
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public int Role { get; set; }
    public string? OfficeNumber { get; set; }
    public string? OfficeHours { get; set; }
    public string? Specialization { get; set; }
    public string? FirebaseUid { get; set; }
}

public class LoginModel
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RefreshTokenModel
{
    public string RefreshToken { get; set; } = string.Empty;
}
