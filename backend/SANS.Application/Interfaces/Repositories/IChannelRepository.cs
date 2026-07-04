using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Repositories;

public interface IChannelRepository : IRepository<Channel>
{
    Task<IEnumerable<Channel>> GetByDepartmentAsync(Guid departmentId);
    Task<IEnumerable<Channel>> GetByUserAsync(Guid userId);
    Task<Channel?> GetWithMembersAsync(Guid channelId);
}
