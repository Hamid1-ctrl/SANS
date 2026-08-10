using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class LearningResourceRepository : Repository<LearningResource>, ILearningResourceRepository
{
    public LearningResourceRepository(D1Context context) : base(context)
    {
    }

    public async Task<IEnumerable<LearningResource>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"DepartmentId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { departmentId });
    }

    public async Task<IEnumerable<LearningResource>> GetByCategoryAsync(string category)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"Category\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { category.Trim() });
    }

    public async Task<IEnumerable<LearningResource>> SearchAsync(string searchTerm)
    {
        var term = searchTerm.Trim().ToLower();
        return await _dbSet.QueryAsync(
            "WHERE \"IsDeleted\" = 0 AND (lower(\"Title\") LIKE '%' || ? || '%' OR lower(\"Description\") LIKE '%' || ? || '%' OR lower(\"Tags\") LIKE '%' || ? || '%')",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { term, term, term });
    }
}
