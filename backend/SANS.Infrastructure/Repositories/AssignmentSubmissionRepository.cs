using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class AssignmentSubmissionRepository : Repository<AssignmentSubmission>, IAssignmentSubmissionRepository
{
    public AssignmentSubmissionRepository(D1Context context) : base(context)
    {
    }

    public async Task<AssignmentSubmission?> GetByAssignmentAndStudentAsync(Guid assignmentId, Guid studentId)
    {
        return await _dbSet.QueryFirstOrDefaultAsync(
            "WHERE lower(\"AssignmentId\") = lower(?) AND lower(\"StudentId\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { assignmentId, studentId });
    }

    public async Task<IEnumerable<AssignmentSubmission>> GetByAssignmentAsync(Guid assignmentId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"AssignmentId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"SubmittedAt\" DESC",
            new object?[] { assignmentId });
    }

    public async Task<IEnumerable<AssignmentSubmission>> GetByStudentAsync(Guid studentId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"StudentId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"SubmittedAt\" DESC",
            new object?[] { studentId });
    }
}
