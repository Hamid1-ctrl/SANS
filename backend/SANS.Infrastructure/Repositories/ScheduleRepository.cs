using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class ScheduleRepository : Repository<Schedule>, IScheduleRepository
{
    public ScheduleRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Schedule>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet
            .Include(s => s.Department)
            .Include(s => s.Instructor)
            .Where(s => s.DepartmentId == departmentId && !s.IsDeleted)
            .OrderBy(s => s.StartTime)
            .ToListAsync();
    }

    public async Task<IEnumerable<Schedule>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _dbSet
            .Include(s => s.Department)
            .Include(s => s.Instructor)
            .Where(s => !s.IsDeleted && s.StartTime >= startDate && s.EndTime <= endDate)
            .OrderBy(s => s.StartTime)
            .ToListAsync();
    }

    public async Task<IEnumerable<Schedule>> GetByInstructorAsync(Guid instructorId)
    {
        return await _dbSet
            .Include(s => s.Department)
            .Where(s => s.InstructorId == instructorId && !s.IsDeleted)
            .OrderBy(s => s.StartTime)
            .ToListAsync();
    }

    public async Task<bool> HasConflictAsync(DateTime startTime, DateTime endTime, string? room, Guid? excludeScheduleId = null)
    {
        var query = _dbSet
            .Where(s => !s.IsDeleted && 
                ((s.StartTime < endTime && s.EndTime > startTime) || 
                 (startTime < s.EndTime && endTime > s.StartTime)));

        if (!string.IsNullOrEmpty(room))
        {
            query = query.Where(s => s.Room == room);
        }

        if (excludeScheduleId.HasValue)
        {
            query = query.Where(s => s.Id != excludeScheduleId.Value);
        }

        return await query.AnyAsync();
    }
}
