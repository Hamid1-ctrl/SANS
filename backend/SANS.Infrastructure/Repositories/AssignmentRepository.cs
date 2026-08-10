using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class AssignmentRepository : Repository<Assignment>, IAssignmentRepository
{
    public AssignmentRepository(D1Context context) : base(context)
    {
    }

    public async Task<IEnumerable<Assignment>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"DepartmentId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { departmentId });
    }

    public async Task<IEnumerable<Assignment>> GetByCreatedByAsync(Guid userId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"CreatedByUserId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { userId });
    }

    public async Task<IEnumerable<Assignment>> GetActiveAssignmentsAsync()
    {
        return await _dbSet.QueryAsync(
            "WHERE \"Status\" = ? AND \"DueDate\" >= ? AND \"IsDeleted\" = 0",
            "ORDER BY \"DueDate\"",
            new object?[] { (int)AssignmentStatus.Published, DateTime.UtcNow });
    }
}
