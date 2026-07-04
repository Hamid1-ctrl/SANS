using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class LearningResourceRepository : Repository<LearningResource>, ILearningResourceRepository
{
    public LearningResourceRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<LearningResource>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet
            .Include(r => r.Department)
            .Include(r => r.UploadedByUser)
            .Where(r => r.DepartmentId == departmentId && !r.IsDeleted)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<LearningResource>> GetByCategoryAsync(string category)
    {
        return await _dbSet
            .Include(r => r.Department)
            .Include(r => r.UploadedByUser)
            .Where(r => r.Category == category && !r.IsDeleted)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<LearningResource>> SearchAsync(string searchTerm)
    {
        return await _dbSet
            .Include(r => r.Department)
            .Include(r => r.UploadedByUser)
            .Where(r => !r.IsDeleted && 
                (r.Title.Contains(searchTerm) || 
                 r.Description.Contains(searchTerm) || 
                 r.Tags.Contains(searchTerm)))
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }
}
