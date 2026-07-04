using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Repositories;

public interface IExamRepository : IRepository<Exam>
{
    Task<IEnumerable<Exam>> GetByDepartmentAsync(Guid departmentId);
    Task<IEnumerable<Exam>> GetPublishedExamsAsync();
    Task<IEnumerable<Exam>> GetByCreatedByAsync(Guid userId);
}
