using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class RefreshTokenRepository : Repository<RefreshToken>, IRefreshTokenRepository
{
    public RefreshTokenRepository(D1Context context) : base(context)
    {
    }

    public async Task<RefreshToken?> GetByTokenAsync(string token)
    {
        return await _dbSet.QueryFirstOrDefaultAsync(
            "WHERE \"Token\" = ? AND \"IsRevoked\" = 0 AND \"IsDeleted\" = 0", new object?[] { token });
    }

    public async Task<RefreshToken?> GetActiveTokenByUserIdAsync(Guid userId)
    {
        return await _dbSet.QueryFirstOrDefaultAsync(
            "WHERE lower(\"UserId\") = lower(?) AND \"IsUsed\" = 0 AND \"IsRevoked\" = 0 AND \"ExpiresAt\" > ? AND \"IsDeleted\" = 0 ORDER BY \"ExpiresAt\" DESC",
            new object?[] { userId, DateTime.UtcNow });
    }

    public async Task RevokeUserTokensAsync(Guid userId)
    {
        var tokens = await _dbSet.QueryAsync(
            "WHERE lower(\"UserId\") = lower(?) AND \"IsRevoked\" = 0 AND \"IsDeleted\" = 0", null, new object?[] { userId });

        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
            _dbSet.Update(token);
        }
    }
}
