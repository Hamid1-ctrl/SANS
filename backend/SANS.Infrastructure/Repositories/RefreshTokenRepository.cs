using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class RefreshTokenRepository : Repository<RefreshToken>, IRefreshTokenRepository
{
    public RefreshTokenRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<RefreshToken?> GetByTokenAsync(string token)
    {
        return await _dbSet.Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == token && !rt.IsRevoked && !rt.IsDeleted);
    }

    public async Task<RefreshToken?> GetActiveTokenByUserIdAsync(Guid userId)
    {
        return await _dbSet
            .Where(rt => rt.UserId == userId && !rt.IsUsed && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow && !rt.IsDeleted)
            .OrderByDescending(rt => rt.ExpiresAt)
            .FirstOrDefaultAsync();
    }

    public async Task RevokeUserTokensAsync(Guid userId)
    {
        var tokens = await _dbSet
            .Where(rt => rt.UserId == userId && !rt.IsRevoked && !rt.IsDeleted)
            .ToListAsync();
        
        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }
        
        _dbSet.UpdateRange(tokens);
    }
}
