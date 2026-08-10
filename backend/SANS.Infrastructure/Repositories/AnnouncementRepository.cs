using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class AnnouncementRepository : Repository<Announcement>, IAnnouncementRepository
{
    public AnnouncementRepository(D1Context context) : base(context)
    {
    }

    public async Task<IEnumerable<Announcement>> GetGlobalAnnouncementsAsync()
    {
        return await _dbSet.QueryAsync(
            "WHERE \"IsGlobal\" = 1 AND \"IsDeleted\" = 0",
            "ORDER BY \"PublishedAt\" DESC");
    }

    public async Task<IEnumerable<Announcement>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"DepartmentId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"PublishedAt\" DESC",
            new object?[] { departmentId });
    }

    public async Task<IEnumerable<Announcement>> GetPinnedAnnouncementsAsync()
    {
        return await _dbSet.QueryAsync(
            "WHERE \"IsPinned\" = 1 AND \"IsDeleted\" = 0",
            "ORDER BY \"PublishedAt\" DESC");
    }
}
