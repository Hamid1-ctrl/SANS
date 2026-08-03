// Import standard System namespace for Guid and DateTime types
using System;
// Import System ComponentModel DataAnnotations for schema validation attributes
using System.ComponentModel.DataAnnotations;
// Import SANS Domain Enums namespace for ProposalStatus enum
using SANS.Domain.Enums;

// Define namespace for SANS Domain entity models
namespace SANS.Domain.Entities;

// Entity representing an academic proposal submitted by a Class Representative to course lecturers
public class RepProposal
{
    // Unique primary key identifier for the proposal record
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    // Title or short subject of the proposal submitted by the class representative
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    // Detailed description, agenda, or justification for the proposal
    [Required]
    public string Description { get; set; } = string.Empty;

    // Foreign key pointing to the target ClassWorkspace entity
    public Guid ClassWorkspaceId { get; set; }

    // Navigation property for the associated ClassWorkspace
    public virtual ClassWorkspace? ClassWorkspace { get; set; }

    // Foreign key pointing to the Class Representative User entity who submitted the proposal
    public Guid SubmittedByRepId { get; set; }

    // Navigation property for the Class Representative User
    public virtual User? SubmittedByRep { get; set; }

    // Status lifecycle state of the proposal (Pending, Approved, Rejected)
    public ProposalStatus Status { get; set; } = ProposalStatus.Pending;

    // Optional feedback notes or response provided by the lecturer upon review
    public string? LecturerFeedback { get; set; }

    // UTC Timestamp when the proposal was created
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Optional UTC Timestamp when the proposal was last updated
    public DateTime? UpdatedAt { get; set; }

    // Soft deletion flag indicating whether the proposal is archived or removed
    public bool IsDeleted { get; set; } = false;
}
