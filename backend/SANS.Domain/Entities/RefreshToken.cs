using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class RefreshToken : AuditableEntity
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime? RevokedAt { get; set; }
    public Guid UserId { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
}
