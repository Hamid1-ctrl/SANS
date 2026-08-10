using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Services.D1;
using System.Security.Claims;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RepProposalsController : ControllerBase
{
    private readonly D1Context _context;

    public RepProposalsController(D1Context context)
    {
        _context = context;
    }

    private Guid GetUserId()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdStr, out var id) ? id : Guid.Empty;
    }

    // GET /api/repproposals — Retrieves class representative proposals accessible to the current user
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        var userId = GetUserId();

        var currentUser = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { userId });
        if (currentUser == null) return Unauthorized();

        var proposals = await _context.RepProposals.QueryAsync("WHERE \"IsDeleted\" = 0");

        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            proposals = proposals.Where(p => p.ClassWorkspaceId == classId.Value).ToList();
        }
        else if (currentUser.Role == UserRole.Lecturer)
        {
            var taughtClasses = await _context.ClassWorkspaces.QueryAsync(
                "WHERE \"IsDeleted\" = 0 AND (" +
                "(\"LecturerId\" IS NOT NULL AND lower(\"LecturerId\") = lower(?)) OR " +
                "(\"CreatedByUserId\" IS NOT NULL AND lower(\"CreatedByUserId\") = lower(?)))",
                new object?[] { userId, userId });
            var taughtClassIds = taughtClasses.Select(c => c.Id).ToList();
            proposals = proposals.Where(p => taughtClassIds.Contains(p.ClassWorkspaceId)).ToList();
        }

        // Load related Class Representative users and ClassWorkspaces in bulk
        var repIds = proposals.Select(p => p.SubmittedByRepId).Distinct().ToList();
        var repUsers = new Dictionary<Guid, User>();
        if (repIds.Count > 0)
        {
            var inClause = string.Join(", ", repIds.Select(_ => "lower(?)"));
            var users = await _context.Users.QueryAsync($"WHERE lower(\"Id\") IN ({inClause})", repIds.Cast<object?>().ToArray());
            repUsers = users.ToDictionary(u => u.Id);
        }

        var classIds = proposals.Select(p => p.ClassWorkspaceId).Distinct().ToList();
        var classMap = new Dictionary<Guid, ClassWorkspace>();
        if (classIds.Count > 0)
        {
            var inClause = string.Join(", ", classIds.Select(_ => "lower(?)"));
            var classes = await _context.ClassWorkspaces.QueryAsync($"WHERE lower(\"Id\") IN ({inClause})", classIds.Cast<object?>().ToArray());
            classMap = classes.ToDictionary(c => c.Id);
        }

        var result = proposals
            .OrderByDescending(p => p.CreatedAt)
            .Select(p =>
            {
                repUsers.TryGetValue(p.SubmittedByRepId, out var rep);
                classMap.TryGetValue(p.ClassWorkspaceId, out var cw);
                return new
                {
                    id = p.Id,
                    title = p.Title,
                    rep = rep != null ? $"{rep.FirstName} {rep.LastName}" : "Class Representative",
                    repEmail = rep?.Email ?? string.Empty,
                    repAvatar = rep?.ProfileImageUrl,
                    details = p.Description,
                    status = p.Status.ToString(),
                    statusCode = (int)p.Status,
                    lecturerFeedback = p.LecturerFeedback,
                    date = p.CreatedAt.ToString("MMM dd, yyyy"),
                    classWorkspaceId = p.ClassWorkspaceId,
                    classCode = cw?.Code ?? string.Empty,
                    className = cw?.Name ?? string.Empty
                };
            })
            .ToList();

        return Ok(result);
    }

    // POST /api/repproposals — Submits a new proposal from a Class Representative
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProposalDto dto)
    {
        var userId = GetUserId();

        var currentUser = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { userId });
        if (currentUser == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Proposal title is required.");
        if (string.IsNullOrWhiteSpace(dto.Description)) return BadRequest("Proposal description details are required.");
        if (dto.ClassWorkspaceId == Guid.Empty) return BadRequest("Target class workspace is required.");

        var classWorkspace = await _context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { dto.ClassWorkspaceId });
        if (classWorkspace == null) return NotFound("Target class workspace not found.");

        bool isAuthorizedRep = currentUser.Role == UserRole.ClassRepresentative ||
                               classWorkspace.ClassRepresentativeId == userId ||
                               classWorkspace.SecondClassRepresentativeId == userId;

        if (!isAuthorizedRep)
        {
            return StatusCode(403, "Only designated Class Representatives can submit academic proposals to faculty.");
        }

        var proposal = new RepProposal
        {
            Id = Guid.NewGuid(),
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            ClassWorkspaceId = dto.ClassWorkspaceId,
            SubmittedByRepId = userId,
            Status = ProposalStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        _context.RepProposals.Add(proposal);
        await _context.SaveChangesAsync();

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
        var userId = GetUserId();

        var currentUser = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { userId });
        if (currentUser == null) return Unauthorized();

        if (currentUser.Role != UserRole.Lecturer)
        {
            return StatusCode(403, "Only course lecturers are authorized to approve academic proposals.");
        }

        var proposal = await _context.RepProposals.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });

        if (proposal == null) return NotFound("Proposal not found.");

        proposal.Status = ProposalStatus.Approved;
        if (dto != null && !string.IsNullOrWhiteSpace(dto.LecturerFeedback))
        {
            proposal.LecturerFeedback = dto.LecturerFeedback.Trim();
        }
        proposal.UpdatedAt = DateTime.UtcNow;
        _context.RepProposals.Update(proposal);

        await _context.SaveChangesAsync();

        var rep = await _context.Users.FindAsync(proposal.SubmittedByRepId);

        return Ok(new
        {
            id = proposal.Id,
            title = proposal.Title,
            rep = rep != null ? $"{rep.FirstName} {rep.LastName}" : "Class Representative",
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
        var userId = GetUserId();

        var currentUser = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { userId });
        if (currentUser == null) return Unauthorized();

        if (currentUser.Role != UserRole.Lecturer)
        {
            return StatusCode(403, "Only course lecturers are authorized to reject academic proposals.");
        }

        var proposal = await _context.RepProposals.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });

        if (proposal == null) return NotFound("Proposal not found.");

        proposal.Status = ProposalStatus.Rejected;
        if (dto != null && !string.IsNullOrWhiteSpace(dto.LecturerFeedback))
        {
            proposal.LecturerFeedback = dto.LecturerFeedback.Trim();
        }
        proposal.UpdatedAt = DateTime.UtcNow;
        _context.RepProposals.Update(proposal);

        await _context.SaveChangesAsync();

        var rep = await _context.Users.FindAsync(proposal.SubmittedByRepId);

        return Ok(new
        {
            id = proposal.Id,
            title = proposal.Title,
            rep = rep != null ? $"{rep.FirstName} {rep.LastName}" : "Class Representative",
            details = proposal.Description,
            status = proposal.Status.ToString(),
            statusCode = (int)proposal.Status,
            lecturerFeedback = proposal.LecturerFeedback,
            date = proposal.CreatedAt.ToString("MMM dd, yyyy")
        });
    }
}

public class CreateProposalDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid ClassWorkspaceId { get; set; }
}

public class ReviewProposalDto
{
    public string? LecturerFeedback { get; set; }
}
