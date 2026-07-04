using Microsoft.EntityFrameworkCore;
using SANS.Application.Interfaces.Repositories;
using SANS.Domain.Entities;
using SANS.Infrastructure.Data;

namespace SANS.Infrastructure.Repositories;

public class MessageRepository : Repository<Message>, IMessageRepository
{
    public MessageRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Message>> GetConversationAsync(Guid userId1, Guid userId2)
    {
        return await _dbSet
            .Include(m => m.Sender)
            .Include(m => m.Receiver)
            .Where(m => !m.IsDeleted && 
                ((m.SenderId == userId1 && m.ReceiverId == userId2) || 
                 (m.SenderId == userId2 && m.ReceiverId == userId1)))
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Message>> GetByChannelAsync(Guid channelId)
    {
        return await _dbSet
            .Include(m => m.Sender)
            .Include(m => m.Channel)
            .Where(m => m.ChannelId == channelId && !m.IsDeleted)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Message>> GetBySenderAsync(Guid senderId)
    {
        return await _dbSet
            .Include(m => m.Receiver)
            .Where(m => m.SenderId == senderId && !m.IsDeleted)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Message>> GetByReceiverAsync(Guid receiverId)
    {
        return await _dbSet
            .Include(m => m.Sender)
            .Where(m => m.ReceiverId == receiverId && !m.IsDeleted)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();
    }
}
