// Import ASP.NET Core authorization namespace for securing API endpoints
using Microsoft.AspNetCore.Authorization;
// Import ASP.NET Core MVC framework namespace for API controller base class and HTTP attributes
using Microsoft.AspNetCore.Mvc;
// Import Entity Framework Core namespace for asynchronous database queries
using Microsoft.EntityFrameworkCore;
// Import SANS Domain entities namespace for RepProposal, ClassWorkspace, User entities
using SANS.Domain.Entities;
// Import SANS Domain enums namespace for UserRole and ProposalStatus
using SANS.Domain.Enums;
// Import SANS Infrastructure data namespace for AppDbContext database access
using SANS.Infrastructure.Data;
// Import System namespace for standard Guid, DateTime, and String operations
using System;
// Import System Linq namespace for standard query operations
using System.Linq;
// Import System Security Claims namespace for extracting authenticated user ID
using System.Security.Claims;
// Import System Threading Tasks namespace for async Task results
using System.Threading.Tasks;

// Define namespace for SANS Web API controller classes
namespace SANS.WebAPI.Controllers;

// Attribute designating this class as an API Controller with automatic validation behavior
[ApiController]
// Set base route path to /api/repproposals
[Route("api/[controller]")]
// Require authenticated user tokens by default for all endpoints in this controller
[Authorize]
public class RepProposalsController : ControllerBase
{
    // Private read-only field storing the Entity Framework database context instance
    private readonly AppDbContext _context;

    // Constructor injecting the application database context instance
    public RepProposalsController(AppDbContext context)
    {
        // Assign the injected AppDbContext to the private controller field
        _context = context;
    }

    // Helper method to extract the authenticated user's database Guid ID from JWT claims
    private Guid GetUserId()
    {
        // Extract NameIdentifier claim string from the current User claims principal
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        // Parse claim string into a Guid, defaulting to Empty if claim is missing or invalid
        return Guid.TryParse(userIdStr, out var id) ? id : Guid.Empty;
    }

    // GET /api/repproposals — Retrieves class representative proposals accessible to the current user
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        // Get the authenticated user's Guid ID
        var userId = GetUserId();

        // Fetch current user from database to inspect role and permissions
        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        // If user record is missing, return 401 Unauthorized
        if (currentUser == null) return Unauthorized();

        // Start querying non-deleted RepProposals from database
        var query = _context.RepProposals
            // Include submitting Class Representative user details
            .Include(p => p.SubmittedByRep)
            // Include target ClassWorkspace details
            .Include(p => p.ClassWorkspace)
            // Filter non-deleted proposals
            .Where(p => !p.IsDeleted);

        // If a specific classWorkspaceId parameter was supplied in the request query
        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            // Filter proposals to only those belonging to the specified class workspace
            query = query.Where(p => p.ClassWorkspaceId == classId.Value);
        }
        else if (currentUser.Role == UserRole.Lecturer)
        {
            // If user is a Lecturer, get IDs of class workspaces taught or created by this lecturer
            var taughtClassIds = await _context.ClassWorkspaces
                .Where(c => !c.IsDeleted && (c.LecturerId == userId || c.CreatedByUserId == userId))
                .Select(c => c.Id)
                .ToListAsync();

            // Filter proposals belonging to any of the lecturer's taught classes
            query = query.Where(p => taughtClassIds.Contains(p.ClassWorkspaceId));
        }

        // Execute query and order proposals by creation date descending
        var proposals = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                // Proposal primary key Guid ID
                id = p.Id,
                // Proposal subject title
                title = p.Title,
                // Submitter representative full name
                rep = p.SubmittedByRep != null ? $"{p.SubmittedByRep.FirstName} {p.SubmittedByRep.LastName}" : "Class Representative",
                // Submitter representative email address
                repEmail = p.SubmittedByRep != null ? p.SubmittedByRep.Email : string.Empty,
                // Submitter representative profile image URL
                repAvatar = p.SubmittedByRep != null ? p.SubmittedByRep.ProfileImageUrl : null,
                // Detailed justification and description text
                details = p.Description,
                // Status string representation (Pending, Approved, Rejected)
                status = p.Status.ToString(),
                // Numeric status enum code
                statusCode = (int)p.Status,
                // Optional lecturer feedback notes
                lecturerFeedback = p.LecturerFeedback,
                // Formatted submission date string
                date = p.CreatedAt.ToString("MMM dd, yyyy"),
                // Associated Class Workspace ID
                classWorkspaceId = p.ClassWorkspaceId,
                // Associated Class Workspace Code
                classCode = p.ClassWorkspace != null ? p.ClassWorkspace.Code : string.Empty,
                // Associated Class Workspace Name
                className = p.ClassWorkspace != null ? p.ClassWorkspace.Name : string.Empty
            })
            .ToListAsync();

        // Return 200 OK with list of proposals
        return Ok(proposals);
    }

    // POST /api/repproposals — Submits a new proposal from a Class Representative
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProposalDto dto)
    {
        // Extract authenticated user ID
        var userId = GetUserId();

        // Fetch submitter user from database
        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        // If user record does not exist, return 401 Unauthorized
        if (currentUser == null) return Unauthorized();

        // Validate title requirement
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Proposal title is required.");
        // Validate description requirement
        if (string.IsNullOrWhiteSpace(dto.Description)) return BadRequest("Proposal description details are required.");
        // Validate target class workspace requirement
        if (dto.ClassWorkspaceId == Guid.Empty) return BadRequest("Target class workspace is required.");

        // Verify that target class workspace exists and is active
        var classWorkspace = await _context.ClassWorkspaces.FirstOrDefaultAsync(c => c.Id == dto.ClassWorkspaceId && !c.IsDeleted);
        // If class workspace is missing, return 404 Not Found
        if (classWorkspace == null) return NotFound("Target class workspace not found.");

        // Check if current user is an authorized Class Representative (either via global UserRole or assigned rep in target workspace)
        bool isAuthorizedRep = currentUser.Role == UserRole.ClassRepresentative || 
                               classWorkspace.ClassRepresentativeId == userId || 
                               classWorkspace.SecondClassRepresentativeId == userId;

        // If user is not an authorized class representative, forbid proposal submission
        if (!isAuthorizedRep)
        {
            // Return 403 Forbidden with explanatory error message
            return StatusCode(403, "Only designated Class Representatives can submit academic proposals to faculty.");
        }

        // Instantiate new RepProposal record
        var proposal = new RepProposal
        {
            // Set unique Guid ID
            Id = Guid.NewGuid(),
            // Set proposal title text
            Title = dto.Title.Trim(),
            // Set proposal description text
            Description = dto.Description.Trim(),
            // Set target class workspace foreign key
            ClassWorkspaceId = dto.ClassWorkspaceId,
            // Set submitter representative foreign key to authenticated user
            SubmittedByRepId = userId,
            // Initialize status to Pending
            Status = ProposalStatus.Pending,
            // Set creation UTC timestamp
            CreatedAt = DateTime.UtcNow,
            // Initialize soft deletion flag to false
            IsDeleted = false
        };

        // Add new proposal record to database set
        _context.RepProposals.Add(proposal);
        // Save database changes asynchronously
        await _context.SaveChangesAsync();

        // Return 201 Created response with response payload
        return CreatedAtAction(nameof(GetAll), new { id = proposal.Id }, new
        {
            id = proposal.Id,
            title = proposal.Title,
            rep = $"{currentUser.FirstName} {currentUser.LastName}",
            repEmail = currentUser.Email,
            repAvatar = currentUser.ProfileImageUrl,
            details = proposal.Description,
            status = proposal.Status.ToString(),
            statusCode = (int)proposal.Status,
            date = proposal.CreatedAt.ToString("MMM dd, yyyy"),
            classWorkspaceId = proposal.ClassWorkspaceId,
            classCode = classWorkspace.Code,
            className = classWorkspace.Name
        });
    }

    // PUT /api/repproposals/{id}/approve — Approves a submitted proposal (Lecturer only)
    [HttpPut("{id}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ReviewProposalDto? dto)
    {
        // Extract authenticated user ID
        var userId = GetUserId();

        // Fetch authenticated user record from database to verify role
        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        // If user record does not exist, return 401 Unauthorized
        if (currentUser == null) return Unauthorized();

        // Verify that the authenticated user is a Lecturer
        if (currentUser.Role != UserRole.Lecturer)
        {
            // Return 403 Forbidden if a non-lecturer attempts to approve a proposal
            return StatusCode(403, "Only course lecturers are authorized to approve academic proposals.");
        }

        // Fetch target proposal from database
        var proposal = await _context.RepProposals
            .Include(p => p.SubmittedByRep)
            .Include(p => p.ClassWorkspace)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        // If proposal does not exist, return 404 Not Found
        if (proposal == null) return NotFound("Proposal not found.");

        // Set status enum to Approved
        proposal.Status = ProposalStatus.Approved;
        // Optionally set lecturer feedback notes
        if (dto != null && !string.IsNullOrWhiteSpace(dto.LecturerFeedback))
        {
            proposal.LecturerFeedback = dto.LecturerFeedback.Trim();
        }
        // Set update UTC timestamp
        proposal.UpdatedAt = DateTime.UtcNow;

        // Save database changes asynchronously
        await _context.SaveChangesAsync();

        // Return 200 OK with updated proposal details
        return Ok(new
        {
            id = proposal.Id,
            title = proposal.Title,
            rep = proposal.SubmittedByRep != null ? $"{proposal.SubmittedByRep.FirstName} {proposal.SubmittedByRep.LastName}" : "Class Representative",
            details = proposal.Description,
            status = proposal.Status.ToString(),
            statusCode = (int)proposal.Status,
            lecturerFeedback = proposal.LecturerFeedback,
            date = proposal.CreatedAt.ToString("MMM dd, yyyy")
        });
    }

    // PUT /api/repproposals/{id}/reject — Rejects a submitted proposal (Lecturer only)
    [HttpPut("{id}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ReviewProposalDto? dto)
    {
        // Extract authenticated user ID
        var userId = GetUserId();

        // Fetch authenticated user record from database to verify role
        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        // If user record does not exist, return 401 Unauthorized
        if (currentUser == null) return Unauthorized();

        // Verify that the authenticated user is a Lecturer
        if (currentUser.Role != UserRole.Lecturer)
        {
            // Return 403 Forbidden if a non-lecturer attempts to reject a proposal
            return StatusCode(403, "Only course lecturers are authorized to reject academic proposals.");
        }

        // Fetch target proposal from database
        var proposal = await _context.RepProposals
            .Include(p => p.SubmittedByRep)
            .Include(p => p.ClassWorkspace)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        // If proposal does not exist, return 404 Not Found
        if (proposal == null) return NotFound("Proposal not found.");

        // Set status enum to Rejected
        proposal.Status = ProposalStatus.Rejected;
        // Optionally set lecturer feedback notes
        if (dto != null && !string.IsNullOrWhiteSpace(dto.LecturerFeedback))
        {
            proposal.LecturerFeedback = dto.LecturerFeedback.Trim();
        }
        // Set update UTC timestamp
        proposal.UpdatedAt = DateTime.UtcNow;

        // Save database changes asynchronously
        await _context.SaveChangesAsync();

        // Return 200 OK with updated proposal details
        return Ok(new
        {
            id = proposal.Id,
            title = proposal.Title,
            rep = proposal.SubmittedByRep != null ? $"{proposal.SubmittedByRep.FirstName} {proposal.SubmittedByRep.LastName}" : "Class Representative",
            details = proposal.Description,
            status = proposal.Status.ToString(),
            statusCode = (int)proposal.Status,
            lecturerFeedback = proposal.LecturerFeedback,
            date = proposal.CreatedAt.ToString("MMM dd, yyyy")
        });
    }
}

// DTO representing creation request payload for a new proposal
public class CreateProposalDto
{
    // Proposal subject title
    public string Title { get; set; } = string.Empty;
    // Proposal description justification details
    public string Description { get; set; } = string.Empty;
    // Target Class Workspace Guid ID
    public Guid ClassWorkspaceId { get; set; }
}

// DTO representing review approval or rejection feedback payload
public class ReviewProposalDto
{
    // Optional lecturer feedback or review notes
    public string? LecturerFeedback { get; set; }
}
