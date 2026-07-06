using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SANS.Application.Interfaces;
using SANS.Domain.Entities;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public DepartmentsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var departments = await _unitOfWork.Departments.GetAllAsync();
        return Ok(departments.Where(d => !d.IsDeleted));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var department = await _unitOfWork.Departments.GetByIdAsync(id);
        if (department == null || department.IsDeleted)
        {
            return NotFound(new { Message = "Department not found" });
        }
        return Ok(department);
    }

    [HttpGet("code/{code}")]
    public async Task<IActionResult> GetByCode(string code)
    {
        var department = await _unitOfWork.Departments.GetByCodeAsync(code);
        if (department == null || department.IsDeleted)
        {
            return NotFound(new { Message = "Department not found" });
        }
        return Ok(department);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDepartmentModel model)
    {
        if (await _unitOfWork.Departments.CodeExistsAsync(model.Code))
        {
            return BadRequest(new { Message = "Department code already exists" });
        }

        var department = new Department
        {
            Id = Guid.NewGuid(),
            Name = model.Name,
            Code = model.Code,
            Description = model.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Departments.AddAsync(department);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = department.Id }, department);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDepartmentModel model)
    {
        var department = await _unitOfWork.Departments.GetByIdAsync(id);
        if (department == null || department.IsDeleted)
        {
            return NotFound(new { Message = "Department not found" });
        }

        department.Name = model.Name;
        department.Code = model.Code;
        department.Description = model.Description;
        department.IsActive = model.IsActive;
        department.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Departments.UpdateAsync(department);
        await _unitOfWork.SaveChangesAsync();

        return Ok(department);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var department = await _unitOfWork.Departments.GetByIdAsync(id);
        if (department == null || department.IsDeleted)
        {
            return NotFound(new { Message = "Department not found" });
        }

        department.IsDeleted = true;
        department.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.Departments.UpdateAsync(department);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { Message = "Department deleted successfully" });
    }
}

public class CreateDepartmentModel
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class UpdateDepartmentModel
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
