using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class MessageRepository : Repository<Message>, IMessageRepository
{
    public MessageRepository(D1Context context) : base(context)
    {
    }

    public async Task<IEnumerable<Message>> GetConversationAsync(Guid userId1, Guid userId2)
    {
        return await _dbSet.QueryAsync(
            "WHERE \"IsDeleted\" = 0 AND ((lower(\"SenderId\") = lower(?) AND lower(\"ReceiverId\") = lower(?)) OR (lower(\"SenderId\") = lower(?) AND lower(\"ReceiverId\") = lower(?)))",
            "ORDER BY \"CreatedAt\"",
            new object?[] { userId1, userId2, userId2, userId1 });
    }

    public async Task<IEnumerable<Message>> GetByChannelAsync(Guid channelId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"ChannelId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\"",
            new object?[] { channelId });
    }

    public async Task<IEnumerable<Message>> GetBySenderAsync(Guid senderId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"SenderId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { senderId });
    }

    public async Task<IEnumerable<Message>> GetByReceiverAsync(Guid receiverId)
    {
        return await _dbSet.QueryAsync(
            "WHERE lower(\"ReceiverId\") = lower(?) AND \"IsDeleted\" = 0",
            "ORDER BY \"CreatedAt\" DESC",
            new object?[] { receiverId });
    }
}
