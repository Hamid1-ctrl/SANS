using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);
    }

    public async Task<User?> GetByStudentIdAsync(string studentId)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.StudentId == studentId && !u.IsDeleted);
    }

    public async Task<IEnumerable<User>> GetByRoleAsync(UserRole role)
    {
        return await _dbSet.Where(u => u.Role == role && !u.IsDeleted).ToListAsync();
    }

    public async Task<IEnumerable<User>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet.Where(u => u.DepartmentId == departmentId && !u.IsDeleted).ToListAsync();
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        return await _dbSet.AnyAsync(u => u.Email == email && !u.IsDeleted);
    }

    public async Task<bool> StudentIdExistsAsync(string studentId)
    {
        return await _dbSet.AnyAsync(u => u.StudentId == studentId && !u.IsDeleted);
    }
}
