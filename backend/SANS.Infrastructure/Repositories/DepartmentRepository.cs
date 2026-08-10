using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class DepartmentRepository : Repository<Department>, IDepartmentRepository
{
    public DepartmentRepository(D1Context context) : base(context)
    {
    }

    public async Task<Department?> GetByCodeAsync(string code)
    {
        return await _dbSet.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Code\") = lower(?)", new object?[] { code.Trim() });
    }

    public async Task<bool> CodeExistsAsync(string code)
    {
        return await _dbSet.AnyAsync("WHERE \"IsDeleted\" = 0 AND lower(\"Code\") = lower(?)", new object?[] { code.Trim() });
    }
}
