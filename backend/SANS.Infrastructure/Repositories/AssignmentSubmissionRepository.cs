using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class AssignmentSubmissionRepository : Repository<AssignmentSubmission>, IAssignmentSubmissionRepository
{
    public AssignmentSubmissionRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<AssignmentSubmission?> GetByAssignmentAndStudentAsync(Guid assignmentId, Guid studentId)
    {
        return await _dbSet
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Include(s => s.GradedByUser)
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId && !s.IsDeleted);
    }

    public async Task<IEnumerable<AssignmentSubmission>> GetByAssignmentAsync(Guid assignmentId)
    {
        return await _dbSet
            .Include(s => s.Student)
            .Include(s => s.GradedByUser)
            .Where(s => s.AssignmentId == assignmentId && !s.IsDeleted)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<AssignmentSubmission>> GetByStudentAsync(Guid studentId)
    {
        return await _dbSet
            .Include(s => s.Assignment)
            .Include(s => s.GradedByUser)
            .Where(s => s.StudentId == studentId && !s.IsDeleted)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }
}
