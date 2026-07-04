using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Repositories;

public interface IAnnouncementRepository : IRepository<Announcement>
{
    Task<IEnumerable<Announcement>> GetGlobalAnnouncementsAsync();
    Task<IEnumerable<Announcement>> GetByDepartmentAsync(Guid departmentId);
    Task<IEnumerable<Announcement>> GetPinnedAnnouncementsAsync();
}
