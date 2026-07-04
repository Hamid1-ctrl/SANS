using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Repositories;

public interface IScheduleRepository : IRepository<Schedule>
{
    Task<IEnumerable<Schedule>> GetByDepartmentAsync(Guid departmentId);
    Task<IEnumerable<Schedule>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<IEnumerable<Schedule>> GetByInstructorAsync(Guid instructorId);
    Task<bool> HasConflictAsync(DateTime startTime, DateTime endTime, string? room, Guid? excludeScheduleId = null);
}
