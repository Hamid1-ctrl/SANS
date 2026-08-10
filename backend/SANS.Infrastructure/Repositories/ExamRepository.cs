using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class ExamRepository : Repository<Exam>, IExamRepository
{
    public ExamRepository(D1Context context) : base(context)
    {
    }

    public async Task<IEnumerable<Exam>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"DepartmentId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"ExamDate\" DESC",
            new object?[] { departmentId });
    }

    public async Task<IEnumerable<Exam>> GetPublishedExamsAsync()
    {
        return await _dbSet.QueryAsync(
            "WHERE \"IsPublished\" = 1 AND \"ExamDate\" >= ? AND \"IsDeleted\" = 0",
            "ORDER BY \"ExamDate\"",
            new object?[] { DateTime.UtcNow });
    }

    public async Task<IEnumerable<Exam>> GetByCreatedByAsync(Guid userId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"CreatedByUserId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"ExamDate\" DESC",
            new object?[] { userId });
    }
}
