using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Services;

public interface IAuthService
{
    Task<(string accessToken, string refreshToken, User user)> LoginAsync(string email, string password);
    Task<(string accessToken, string refreshToken, User user)> RegisterAsync(
        string email,
        string password,
        string firstName,
        string lastName,
        string studentId,
        string phoneNumber,
        int role,
        string? officeNumber = null,
        string? officeHours = null,
        string? specialization = null);
    Task<(string accessToken, string refreshToken)> RefreshTokenAsync(string refreshToken);
    Task<bool> LogoutAsync(string refreshToken);
    Task<User?> GetUserByIdAsync(Guid userId);
}
