using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Repositories;

public interface IAssignmentSubmissionRepository : IRepository<AssignmentSubmission>
{
    Task<AssignmentSubmission?> GetByAssignmentAndStudentAsync(Guid assignmentId, Guid studentId);
    Task<IEnumerable<AssignmentSubmission>> GetByAssignmentAsync(Guid assignmentId);
    Task<IEnumerable<AssignmentSubmission>> GetByStudentAsync(Guid studentId);
}
