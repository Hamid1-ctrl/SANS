using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;
using SANS.Domain.Enums;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public AssignmentsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var assignments = await _unitOfWork.Assignments.GetAllAsync();
        return Ok(assignments.Where(a => !a.IsDeleted));
    }

    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        var assignments = await _unitOfWork.Assignments.GetByDepartmentAsync(departmentId);
        return Ok(assignments.Where(a => !a.IsDeleted));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }
        return Ok(assignment);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAssignmentModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var assignment = new Assignment
        {
            Id = Guid.NewGuid(),
            Title = model.Title,
            Description = model.Description,
            Instructions = model.Instructions,
            DueDate = model.DueDate,
            PublishedAt = model.PublishedAt,
            MaxPoints = model.MaxPoints,
            Status = AssignmentStatus.Published,
            AllowLateSubmission = model.AllowLateSubmission,
            LateSubmissionPenalty = model.LateSubmissionPenalty,
            DepartmentId = model.DepartmentId,
            CreatedByUserId = userId,
            AttachmentUrl = model.AttachmentUrl,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Assignments.AddAsync(assignment);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = assignment.Id }, assignment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAssignmentModel model)
    {
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }

        assignment.Title = model.Title;
        assignment.Description = model.Description;
        assignment.Instructions = model.Instructions;
        assignment.DueDate = model.DueDate;
        assignment.MaxPoints = model.MaxPoints;
        assignment.AllowLateSubmission = model.AllowLateSubmission;
        assignment.LateSubmissionPenalty = model.LateSubmissionPenalty;
        assignment.AttachmentUrl = model.AttachmentUrl;
        assignment.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Assignments.UpdateAsync(assignment);
        await _unitOfWork.SaveChangesAsync();

        return Ok(assignment);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }

        assignment.IsDeleted = true;
        assignment.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.Assignments.UpdateAsync(assignment);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "Assignment deleted successfully" });
    }

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(Guid id, [FromBody] SubmitAssignmentModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }

        var existingSubmission = await _unitOfWork.AssignmentSubmissions.GetByAssignmentAndStudentAsync(id, userId);
        if (existingSubmission != null)
        {
            return BadRequest(new { Message = "Assignment already submitted" });
        }

        var isLate = DateTime.UtcNow > assignment.DueDate;

        var submission = new AssignmentSubmission
        {
            Id = Guid.NewGuid(),
            AssignmentId = id,
            StudentId = userId,
            SubmittedAt = DateTime.UtcNow,
            Content = model.Content,
            AttachmentUrl = model.AttachmentUrl,
            IsLateSubmission = isLate,
            Status = AssignmentStatus.Submitted,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.AssignmentSubmissions.AddAsync(submission);
        await _unitOfWork.SaveChangesAsync();

        return Ok(submission);
    }

    [HttpGet("{id}/submissions")]
    public async Task<IActionResult> GetSubmissions(Guid id)
    {
        var assignment = await _unitOfWork.Assignments.GetByIdAsync(id);
        if (assignment == null || assignment.IsDeleted)
        {
            return NotFound(new { Message = "Assignment not found" });
        }

        var submissions = await _unitOfWork.AssignmentSubmissions.GetByAssignmentAsync(id);
        return Ok(submissions.Where(s => !s.IsDeleted));
    }
}

public class CreateAssignmentModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int MaxPoints { get; set; }
    public bool AllowLateSubmission { get; set; }
    public int? LateSubmissionPenalty { get; set; }
    public Guid DepartmentId { get; set; }
    public string? AttachmentUrl { get; set; }
}

public class UpdateAssignmentModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public int MaxPoints { get; set; }
    public bool AllowLateSubmission { get; set; }
    public int? LateSubmissionPenalty { get; set; }
    public string? AttachmentUrl { get; set; }
}

public class SubmitAssignmentModel
{
    public string? Content { get; set; }
    public string? AttachmentUrl { get; set; }
}
