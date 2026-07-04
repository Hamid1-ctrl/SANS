using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.Application.Interfaces.Repositories;

public interface IMessageRepository : IRepository<Message>
{
    Task<IEnumerable<Message>> GetConversationAsync(Guid userId1, Guid userId2);
    Task<IEnumerable<Message>> GetByChannelAsync(Guid channelId);
    Task<IEnumerable<Message>> GetBySenderAsync(Guid senderId);
    Task<IEnumerable<Message>> GetByReceiverAsync(Guid receiverId);
}
