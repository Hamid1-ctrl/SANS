using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class NotificationRepository : Repository<Notification>, INotificationRepository
{
    public NotificationRepository(D1Context context) : base(context)
    {
    }

    public async Task<IEnumerable<Notification>> GetByUserIdAsync(Guid userId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"UserId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { userId });
    }

    public async Task<IEnumerable<Notification>> GetUnreadByUserIdAsync(Guid userId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"UserId\") = lower(?) AND \"IsRead\" = 0 AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { userId });
    }

    public async Task MarkAsReadAsync(Guid notificationId)
    {
        var notification = await _dbSet.FindAsync(notificationId);
        if (notification != null)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            _dbSet.Update(notification);
        }
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        var notifications = await _dbSet.QueryAsync(
            "WHERE lower(\"UserId\") = lower(?) AND \"IsRead\" = 0 AND \"IsDeleted\" = 0", null, new object?[] { userId });

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            _dbSet.Update(notification);
        }
    }
}
