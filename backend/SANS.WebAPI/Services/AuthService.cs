using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SANS.Application.Interfaces;
using SANS.Application.Interfaces.Repositories;
using SANS.Application.Interfaces.Services;
using SANS.Domain.Entities;
using SANS.Domain.Enums;

namespace SANS.WebAPI.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;

    public AuthService(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _configuration = configuration;
    }

    public async Task<(string accessToken, string refreshToken, User user)> LoginAsync(string email, string password)
    {
        var user = await _userRepository.GetByEmailAsync(email);
        
        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid email or password");
        }

        if (!await VerifyPasswordAsync(password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Account is inactive");
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync();

        var accessToken = GenerateAccessToken(user);
        var refreshToken = await GenerateRefreshTokenAsync(user);

        return (accessToken, refreshToken.Token, user);
    }

    public async Task<(string accessToken, string refreshToken, User user)> RegisterAsync(
        string email,
        string password,
        string firstName,
        string lastName,
        string studentId,
        string phoneNumber,
        int role)
    {
        if (await _userRepository.EmailExistsAsync(email))
        {
            throw new InvalidOperationException("Email already exists");
        }

        if (await _userRepository.StudentIdExistsAsync(studentId))
        {
            throw new InvalidOperationException("Student ID already exists");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = await HashPasswordAsync(password),
            FirstName = firstName,
            LastName = lastName,
            StudentId = studentId,
            PhoneNumber = phoneNumber,
            Role = (UserRole)role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();

        var accessToken = GenerateAccessToken(user);
        var refreshToken = await GenerateRefreshTokenAsync(user);

        return (accessToken, refreshToken.Token, user);
    }

    public async Task<(string accessToken, string refreshToken)> RefreshTokenAsync(string refreshToken)
    {
        var token = await _refreshTokenRepository.GetByTokenAsync(refreshToken);
        
        if (token == null || token.IsRevoked || token.ExpiresAt < DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token");
        }

        var user = await _userRepository.GetByIdAsync(token.UserId);
        
        if (user == null || !user.IsActive)
        {
            throw new UnauthorizedAccessException("User not found or inactive");
        }

        // Revoke old token
        token.IsRevoked = true;
        await _refreshTokenRepository.UpdateAsync(token);

        // Generate new tokens
        var accessToken = GenerateAccessToken(user);
        var newRefreshToken = await GenerateRefreshTokenAsync(user);

        await _unitOfWork.SaveChangesAsync();

        return (accessToken, newRefreshToken.Token);
    }

    public async Task<bool> LogoutAsync(string refreshToken)
    {
        var token = await _refreshTokenRepository.GetByTokenAsync(refreshToken);
        
        if (token != null)
        {
            token.IsRevoked = true;
            await _refreshTokenRepository.UpdateAsync(token);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        return false;
    }

    public async Task<User?> GetUserByIdAsync(Guid userId)
    {
        return await _userRepository.GetByIdAsync(userId);
    }

    private string GenerateAccessToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"];
        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];
        var expiryMinutes = int.Parse(jwtSettings["ExpiryMinutes"] ?? "60");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new Claim(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, ((int)user.Role).ToString()),
            new Claim("studentId", user.StudentId)
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<RefreshToken> GenerateRefreshTokenAsync(User user)
    {
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = GenerateRandomToken(),
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false,
            CreatedAt = DateTime.UtcNow
        };

        await _refreshTokenRepository.AddAsync(refreshToken);
        return refreshToken;
    }

    private string GenerateRandomToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    private async Task<string> HashPasswordAsync(string password)
    {
        return await Task.Run(() =>
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        });
    }

    private async Task<bool> VerifyPasswordAsync(string password, string hash)
    {
        return await Task.Run(() =>
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            var hashedPassword = Convert.ToBase64String(hashedBytes);
            return hashedPassword == hash;
        });
    }
}
