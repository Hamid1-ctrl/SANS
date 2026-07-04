using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class AssignmentRepository : Repository<Assignment>, IAssignmentRepository
{
    public AssignmentRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Assignment>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet
            .Include(a => a.Department)
            .Include(a => a.CreatedByUser)
            .Where(a => a.DepartmentId == departmentId && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Assignment>> GetByCreatedByAsync(Guid userId)
    {
        return await _dbSet
            .Include(a => a.Department)
            .Where(a => a.CreatedByUserId == userId && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Assignment>> GetActiveAssignmentsAsync()
    {
        return await _dbSet
            .Include(a => a.Department)
            .Where(a => a.Status == AssignmentStatus.Published && a.DueDate >= DateTime.UtcNow && !a.IsDeleted)
            .OrderBy(a => a.DueDate)
            .ToListAsync();
    }
}
