using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Repositories;

public interface IAssignmentRepository : IRepository<Assignment>
{
    Task<IEnumerable<Assignment>> GetByDepartmentAsync(Guid departmentId);
    Task<IEnumerable<Assignment>> GetByCreatedByAsync(Guid userId);
    Task<IEnumerable<Assignment>> GetActiveAssignmentsAsync();
}
