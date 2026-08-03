// Define namespace for SANS Domain enumeration definitions
namespace SANS.Domain.Enums;

// Enumeration representing the status lifecycle of a Class Representative Proposal
public enum ProposalStatus
{
    // Indicates the proposal is newly submitted and pending faculty review
    Pending = 0,

    // Indicates the proposal has been reviewed and approved by the lecturer
    Approved = 1,

    // Indicates the proposal has been reviewed and rejected by the lecturer
    Rejected = 2
}
