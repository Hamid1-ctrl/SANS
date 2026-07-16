using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SANS.Domain.Common;

namespace SANS.Domain.Entities;

public class Quiz : AuditableEntity
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string Course { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public int Points { get; set; }
    public int QuestionsCount { get; set; }

    public Guid ClassWorkspaceId { get; set; }
    
    // Navigation properties
    public ClassWorkspace? ClassWorkspace { get; set; }
}
