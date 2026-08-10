using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class ScheduleRepository : Repository<Schedule>, IScheduleRepository
{
    public ScheduleRepository(D1Context context) : base(context)
    {
    }

    public async Task<IEnumerable<Schedule>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"DepartmentId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"StartTime\"",
            new object?[] { departmentId });
    }

    public async Task<IEnumerable<Schedule>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _dbSet.QueryAsync(
            "WHERE \"IsDeleted\" = 0 AND \"StartTime\" >= ? AND \"EndTime\" <= ?",
            "ORDER BY \"StartTime\"",
            new object?[] { startDate, endDate });
    }

    public async Task<IEnumerable<Schedule>> GetByInstructorAsync(Guid instructorId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"InstructorId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"StartTime\"",
            new object?[] { instructorId });
    }

    public async Task<bool> HasConflictAsync(DateTime startTime, DateTime endTime, string? room, Guid? excludeScheduleId = null)
    {
        var where = "WHERE \"IsDeleted\" = 0 AND ((\"StartTime\" < ? AND \"EndTime\" > ?) OR (\"StartTime\" < ? AND \"EndTime\" > ?))";
        var parameters = new List<object?> { endTime, startTime, endTime, startTime };

        if (!string.IsNullOrEmpty(room))
        {
            where += " AND \"Room\" = ?";
            parameters.Add(room);
        }

        if (excludeScheduleId.HasValue)
        {
            where += " AND lower(\"Id\") != lower(?)";
            parameters.Add(excludeScheduleId.Value);
        }

        return await _dbSet.AnyAsync(where, parameters.ToArray());
    }
}
