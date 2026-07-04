using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Repositories;

public interface IRefreshTokenRepository : IRepository<RefreshToken>
{
    Task<RefreshToken?> GetByTokenAsync(string token);
    Task<RefreshToken?> GetActiveTokenByUserIdAsync(Guid userId);
    Task RevokeUserTokensAsync(Guid userId);
}
