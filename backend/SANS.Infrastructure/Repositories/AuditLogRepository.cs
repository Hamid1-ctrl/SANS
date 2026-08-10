using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class AuditLogRepository : Repository<AuditLog>, IAuditLogRepository
{
    public AuditLogRepository(D1Context context) : base(context)
    {
    }

    public async Task<IEnumerable<AuditLog>> GetByUserIdAsync(Guid userId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"UserId\") = lower(?)",
            "ORDER BY \"Timestamp\" DESC",
            new object?[] { userId });
    }

    public async Task<IEnumerable<AuditLog>> GetByEntityAsync(string entityName, Guid? entityId)
    {
        if (entityId.HasValue)
        {
            return await _dbSet.QueryAsync(
                "WHERE \"EntityName\" = ? AND lower(\"EntityId\") = lower(?)",
                "ORDER BY \"Timestamp\" DESC",
                new object?[] { entityName, entityId.Value });
        }
        return await _dbSet.QueryAsync(
            "WHERE \"EntityName\" = ?",
            "ORDER BY \"Timestamp\" DESC",
            new object?[] { entityName });
    }

    public async Task<IEnumerable<AuditLog>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _dbSet.QueryAsync(
            "WHERE \"Timestamp\" >= ? AND \"Timestamp\" <= ?",
            "ORDER BY \"Timestamp\" DESC",
            new object?[] { startDate, endDate });
    }
}
