using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class ChannelRepository : Repository<Channel>, IChannelRepository
{
    public ChannelRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Channel>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet
            .Include(c => c.Department)
            .Include(c => c.CreatedByUser)
            .Where(c => c.DepartmentId == departmentId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Channel>> GetByUserAsync(Guid userId)
    {
        return await _dbSet
            .Include(c => c.Members)
            .Where(c => c.Members.Any(m => m.UserId == userId) && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
    }

    public async Task<Channel?> GetWithMembersAsync(Guid channelId)
    {
        return await _dbSet
            .Include(c => c.Department)
            .Include(c => c.CreatedByUser)
            .Include(c => c.Members)
            .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => c.Id == channelId && !c.IsDeleted);
    }
}
