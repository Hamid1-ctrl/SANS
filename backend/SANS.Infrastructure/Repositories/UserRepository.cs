using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(D1Context context) : base(context)
    {
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        var normalized = email.Trim().ToLower();
        return await _dbSet.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"Email\") = lower(?)", new object?[] { normalized });
    }

    public async Task<User?> GetByStudentIdAsync(string studentId)
    {
        var normalized = studentId.Trim().ToLower();
        return await _dbSet.QueryFirstOrDefaultAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"StudentId\") = lower(?)", new object?[] { normalized });
    }

    public async Task<IEnumerable<User>> GetByRoleAsync(UserRole role)
    {
        return await _dbSet.QueryAsync("WHERE \"IsDeleted\" = 0 AND \"Role\" = ?", null, new object?[] { (int)role });
    }

    public async Task<IEnumerable<User>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet.QueryAsync(
            "WHERE \"IsDeleted\" = 0 AND lower(\"DepartmentId\") = lower(?)", null, new object?[] { departmentId });
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        var normalized = email.Trim().ToLower();
        return await _dbSet.AnyAsync("WHERE \"IsDeleted\" = 0 AND lower(\"Email\") = lower(?)", new object?[] { normalized });
    }

    public async Task<bool> StudentIdExistsAsync(string studentId)
    {
        var normalized = studentId.Trim().ToLower();
        return await _dbSet.AnyAsync("WHERE \"IsDeleted\" = 0 AND lower(\"StudentId\") = lower(?)", new object?[] { normalized });
    }
}
