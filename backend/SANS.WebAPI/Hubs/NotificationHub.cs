using Microsoft.AspNetCore.SignalR;

namespace SANS.WebAPI.Hubs;

public class NotificationHub : Hub
{
    private static readonly Dictionary<string, HashSet<string>> _userConnections = new();
    private static readonly Dictionary<string, HashSet<string>> _roleGroups = new();

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId))
        {
            if (!_userConnections.ContainsKey(userId))
            {
                _userConnections[userId] = new HashSet<string>();
            }
            _userConnections[userId].Add(Context.ConnectionId);
            
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId) && _userConnections.ContainsKey(userId))
        {
            _userConnections[userId].Remove(Context.ConnectionId);
            
            if (_userConnections[userId].Count == 0)
            {
                _userConnections.Remove(userId);
            }
            
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinRoleGroup(string role)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Role_{role}");
    }

    public async Task LeaveRoleGroup(string role)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Role_{role}");
    }

    public async Task JoinDepartmentGroup(Guid departmentId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Department_{departmentId}");
    }

    public async Task LeaveDepartmentGroup(Guid departmentId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Department_{departmentId}");
    }
}
