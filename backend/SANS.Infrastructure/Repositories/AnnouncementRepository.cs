using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class AnnouncementRepository : Repository<Announcement>, IAnnouncementRepository
{
    public AnnouncementRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Announcement>> GetGlobalAnnouncementsAsync()
    {
        return await _dbSet
            .Where(a => a.IsGlobal && !a.IsDeleted)
            .OrderByDescending(a => a.PublishedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Announcement>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet
            .Where(a => a.DepartmentId == departmentId && !a.IsDeleted)
            .OrderByDescending(a => a.PublishedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Announcement>> GetPinnedAnnouncementsAsync()
    {
        return await _dbSet
            .Where(a => a.IsPinned && !a.IsDeleted)
            .OrderByDescending(a => a.PublishedAt)
            .ToListAsync();
    }
}
