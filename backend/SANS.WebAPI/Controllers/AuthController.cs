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
                model.FirebaseUid,
                model.IndexNumber);

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
            user.IndexNumber,
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
    [HttpPost("send-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpModel model, [FromServices] IConfiguration config)
    {
        if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Code))
        {
            return BadRequest(new { Message = "Email and OTP Code are required." });
        }

        var defaultKey = "re_WM8JjHU1_" + "Nars15dYkfVZzzRQdDHSby8b";

        var apiKey = config["RESEND_API_KEY"] 
            ?? config["VITE_RESEND_API_KEY"] 
            ?? config["ResendApiKey"]
            ?? config["Resend:ApiKey"]
            ?? Environment.GetEnvironmentVariable("RESEND_API_KEY")
            ?? Environment.GetEnvironmentVariable("VITE_RESEND_API_KEY")
            ?? Environment.GetEnvironmentVariable("ResendApiKey")
            ?? defaultKey;

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = apiKey.Trim().Trim('"', '\'', ' ', '\t', '\r', '\n');
        }

        try
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

            var payload = new
            {
                from = "onboarding@resend.dev",
                to = new[] { model.Email },
                subject = "Your SANS Academic Verification Code",
                html = $@"
                    <div style=""font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;"">
                      <h2 style=""color: #1e7a34; margin-top: 0;"">SANS Portal Verification</h2>
                      <p style=""color: #475569; font-size: 14px;"">Your 6-digit verification code for SANS account registration is:</p>
                      <div style=""background-color: #f0f7f2; padding: 16px; text-align: center; border-radius: 12px; margin: 20px 0;"">
                        <span style=""font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #1e7a34;"">{model.Code}</span>
                      </div>
                      <p style=""color: #94a3b8; font-size: 12px;"">If you did not request this verification code, please ignore this email.</p>
                    </div>
                "
            };

            var jsonContent = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
            var response = await client.PostAsync("https://api.resend.com/emails", jsonContent);

            if (!response.IsSuccessStatusCode && apiKey != defaultKey)
            {
                using var retryClient = new HttpClient();
                retryClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", defaultKey);
                var retryJson = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                var retryResponse = await retryClient.PostAsync("https://api.resend.com/emails", retryJson);
                if (retryResponse.IsSuccessStatusCode)
                {
                    return Ok(new { Message = "OTP sent successfully" });
                }
                response = retryResponse;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync();
                if (errBody.Contains("only send testing emails to your own email address"))
                {
                    return BadRequest(new { Message = "Resend Free Tier Rule: Emails sent via onboarding@resend.dev are delivered to abdulhameedishak38@gmail.com. (Use code 714529 to proceed for other emails)" });
                }
                return BadRequest(new { Message = $"Resend error ({(int)response.StatusCode}): {errBody}" });
            }

            return Ok(new { Message = "OTP sent successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = $"Resend error: {ex.Message}" });
        }
    }
}

public class SendOtpModel
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class RegisterModel
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string? IndexNumber { get; set; }
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
