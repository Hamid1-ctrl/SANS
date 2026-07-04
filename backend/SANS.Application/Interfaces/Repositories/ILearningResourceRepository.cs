using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Repositories;

public interface ILearningResourceRepository : IRepository<LearningResource>
{
    Task<IEnumerable<LearningResource>> GetByDepartmentAsync(Guid departmentId);
    Task<IEnumerable<LearningResource>> GetByCategoryAsync(string category);
    Task<IEnumerable<LearningResource>> SearchAsync(string searchTerm);
}
