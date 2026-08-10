using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class ChannelRepository : Repository<Channel>, IChannelRepository
{
    public ChannelRepository(D1Context context) : base(context)
    {
    }

    public async Task<IEnumerable<Channel>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"DepartmentId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { departmentId });
    }

    public async Task<IEnumerable<Channel>> GetByUserAsync(Guid userId)
    {
        return await _dbSet.QueryAsync(
            "WHERE \"IsDeleted\" = 0 AND EXISTS (SELECT 1 FROM \"ChannelMembers\" cm WHERE cm.\"ChannelId\" = \"Channels\".\"Id\" AND lower(cm.\"UserId\") = lower(?))",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { userId });
    }

    public async Task<Channel?> GetWithMembersAsync(Guid channelId)
    {
        return await _dbSet.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { channelId });
    }
}
