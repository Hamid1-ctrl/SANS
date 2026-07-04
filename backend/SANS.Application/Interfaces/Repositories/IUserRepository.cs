using SANS.Application.Interfaces;
using SANS.Domain.Entities;
using SANS.Domain.Enums;

namespace SANS.Application.Interfaces.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByStudentIdAsync(string studentId);
    Task<IEnumerable<User>> GetByRoleAsync(UserRole role);
    Task<IEnumerable<User>> GetByDepartmentAsync(Guid departmentId);
    Task<bool> EmailExistsAsync(string email);
    Task<bool> StudentIdExistsAsync(string studentId);
}
