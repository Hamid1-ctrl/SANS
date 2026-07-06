using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SchedulesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public SchedulesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var schedules = await _unitOfWork.Schedules.GetAllAsync();
        return Ok(schedules.Where(s => !s.IsDeleted));
    }

    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        var schedules = await _unitOfWork.Schedules.GetByDepartmentAsync(departmentId);
        return Ok(schedules.Where(s => !s.IsDeleted));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var schedule = await _unitOfWork.Schedules.GetByIdAsync(id);
        if (schedule == null || schedule.IsDeleted)
        {
            return NotFound(new { Message = "Schedule not found" });
        }
        return Ok(schedule);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateScheduleModel model)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            return Unauthorized();
        }

        var schedule = new Schedule
        {
            Id = Guid.NewGuid(),
            Title = model.Title,
            Description = model.Description,
            StartTime = model.StartTime,
            EndTime = model.EndTime,
            Location = model.Location,
            Room = model.Room,
            DepartmentId = model.DepartmentId,
            IsRecurring = model.IsRecurring,
            RecurrencePattern = model.RecurrencePattern,
            InstructorId = model.InstructorId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Schedules.AddAsync(schedule);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = schedule.Id }, schedule);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateScheduleModel model)
    {
        var schedule = await _unitOfWork.Schedules.GetByIdAsync(id);
        if (schedule == null || schedule.IsDeleted)
        {
            return NotFound(new { Message = "Schedule not found" });
        }

        schedule.Title = model.Title;
        schedule.Description = model.Description;
        schedule.StartTime = model.StartTime;
        schedule.EndTime = model.EndTime;
        schedule.Location = model.Location;
        schedule.Room = model.Room;
        schedule.IsRecurring = model.IsRecurring;
        schedule.RecurrencePattern = model.RecurrencePattern;
        schedule.InstructorId = model.InstructorId;
        schedule.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Schedules.UpdateAsync(schedule);
        await _unitOfWork.SaveChangesAsync();

        return Ok(schedule);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var schedule = await _unitOfWork.Schedules.GetByIdAsync(id);
        if (schedule == null || schedule.IsDeleted)
        {
            return NotFound(new { Message = "Schedule not found" });
        }

        schedule.IsDeleted = true;
        schedule.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.Schedules.UpdateAsync(schedule);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "Schedule deleted successfully" });
    }
}

public class CreateScheduleModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public Guid DepartmentId { get; set; }
    public bool IsRecurring { get; set; }
    public string? RecurrencePattern { get; set; }
    public Guid? InstructorId { get; set; }
}

public class UpdateScheduleModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public bool IsRecurring { get; set; }
    public string? RecurrencePattern { get; set; }
    public Guid? InstructorId { get; set; }
}
