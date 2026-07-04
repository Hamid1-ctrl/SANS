using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class ExamRepository : Repository<Exam>, IExamRepository
{
    public ExamRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Exam>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet
            .Include(e => e.Department)
            .Include(e => e.CreatedByUser)
            .Where(e => e.DepartmentId == departmentId && !e.IsDeleted)
            .OrderByDescending(e => e.ExamDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<Exam>> GetPublishedExamsAsync()
    {
        return await _dbSet
            .Include(e => e.Department)
            .Where(e => e.IsPublished && e.ExamDate >= DateTime.UtcNow && !e.IsDeleted)
            .OrderBy(e => e.ExamDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<Exam>> GetByCreatedByAsync(Guid userId)
    {
        return await _dbSet
            .Include(e => e.Department)
            .Where(e => e.CreatedByUserId == userId && !e.IsDeleted)
            .OrderByDescending(e => e.ExamDate)
            .ToListAsync();
    }
}
