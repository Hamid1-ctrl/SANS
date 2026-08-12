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
public class ClassWorkspacesController : ControllerBase
{
    private readonly D1Context _context;
    private readonly D1SchemaRepairer? _repairer;

    public ClassWorkspacesController(D1Context context, D1SchemaRepairer? repairer = null)
    {
        _context = context;
        _repairer = repairer;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    // Loads enrolled-student counts for many class ids in a single query.
    private async Task<Dictionary<Guid, int>> LoadStudentsCountsAsync(List<Guid> classIds)
    {
        var counts = new Dictionary<Guid, int>();
        if (classIds.Count == 0) return counts;
        var inClause = string.Join(", ", classIds.Select(_ => "lower(?)"));
        var rows = await _context.QueryRowsAsync(
            $"SELECT ce.\"EnrolledClassesId\" AS ClassId, COUNT(*) AS Cnt FROM \"ClassEnrollments\" ce " +
            $"WHERE lower(ce.\"EnrolledClassesId\") IN ({inClause}) GROUP BY ce.\"EnrolledClassesId\"",
            classIds.Cast<object?>().ToArray());
        foreach (var row in rows)
        {
            var classId = D1ValueConverter.ParseGuid(row.TryGetValue("ClassId", out var v) ? v : null);
            var cnt = Convert.ToInt32(row.TryGetValue("Cnt", out var c) ? c : 0);
            counts[classId] = cnt;
        }
        return counts;
    }

    private async Task<Dictionary<Guid, User>> LoadUsersByIdsAsync(List<Guid> ids)
    {
        var map = new Dictionary<Guid, User>();
        if (ids.Count == 0) return map;
        var inClause = string.Join(", ", ids.Select(_ => "lower(?)"));
        var users = await _context.Users.QueryAsync($"WHERE lower(\"Id\") IN ({inClause})", ids.Cast<object?>().ToArray());
        foreach (var u in users) map[u.Id] = u;
        return map;
    }

    // GET /api/classworkspaces — Returns class workspaces belonging to or relevant for the current user
    [HttpGet]
    public async Task<IActionResult> GetMyClasses()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        List<ClassWorkspace> classes;

        if (dbUser.Role == UserRole.Administrator)
        {
            classes = await _context.ClassWorkspaces.QueryAsync("WHERE \"IsDeleted\" = 0");
        }
        else if (dbUser.Role == UserRole.Lecturer)
        {
            classes = await _context.ClassWorkspaces.QueryAsync(
                "WHERE \"IsDeleted\" = 0 AND (" +
                "(\"LecturerId\" IS NOT NULL AND lower(\"LecturerId\") = lower(?)) OR " +
                "(\"CreatedByUserId\" IS NOT NULL AND lower(\"CreatedByUserId\") = lower(?)) OR " +
                "\"LecturerId\" IS NULL)",
                new object?[] { userId, userId });

            if (classes.Count == 0)
            {
                classes = await _context.ClassWorkspaces.QueryAsync("WHERE \"IsDeleted\" = 0");
            }
        }
        else
        {
            classes = await _context.ClassWorkspaces.QueryAsync(
                "WHERE \"IsDeleted\" = 0 AND (" +
                "(\"ClassRepresentativeId\" IS NOT NULL AND lower(\"ClassRepresentativeId\") = lower(?)) OR " +
                "(\"SecondClassRepresentativeId\" IS NOT NULL AND lower(\"SecondClassRepresentativeId\") = lower(?)) OR " +
                "(\"CreatedByUserId\" IS NOT NULL AND lower(\"CreatedByUserId\") = lower(?)) OR " +
                "EXISTS (SELECT 1 FROM \"ClassEnrollments\" ce WHERE ce.\"EnrolledClassesId\" = \"ClassWorkspaces\".\"Id\" AND lower(ce.\"StudentsId\") = lower(?)))",
                new object?[] { userId, userId, userId, userId });
        }

        // Load lecturers, student counts, and user's enrollment status in bulk
        var lecturerIds = classes.Where(c => c.LecturerId.HasValue).Select(c => c.LecturerId!.Value).Distinct().ToList();
        var lecturerMap = await LoadUsersByIdsAsync(lecturerIds);
        var counts = await LoadStudentsCountsAsync(classes.Select(c => c.Id).ToList());
        var enrolledClassIds = (dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.Administrator)
            ? classes.Select(c => c.Id).ToList()
            : await _context.GetEnrolledClassIdsAsync(userId);

        var result = classes.Select(c =>
        {
            lecturerMap.TryGetValue(c.LecturerId ?? Guid.Empty, out var lecturer);
            bool isEnrolled = dbUser.Role == UserRole.Administrator ||
                             dbUser.Role == UserRole.Lecturer ||
                             c.ClassRepresentativeId == userId ||
                             c.SecondClassRepresentativeId == userId ||
                             c.CreatedByUserId == userId ||
                             enrolledClassIds.Contains(c.Id);

            return new
            {
                c.Id,
                c.Name,
                c.Code,
                c.Description,
                c.CourseCode,
                c.DepartmentText,
                c.AcademicLevel,
                c.Semester,
                ClassRepresentativeId = c.ClassRepresentativeId,
                SecondClassRepresentativeId = c.SecondClassRepresentativeId,
                LecturerId = c.LecturerId,
                LecturerName = lecturer != null ? $"{lecturer.FirstName} {lecturer.LastName}" : "Unassigned",
                HasLecturer = c.LecturerId.HasValue,
                StudentsCount = counts.TryGetValue(c.Id, out var n) ? n : 0,
                CreatedByUserId = c.CreatedByUserId,
                IsEnrolled = isEnrolled
            };
        });

        return Ok(result);
    }

    // GET /api/classworkspaces/all — Returns all active university class workspaces with enrollment status
    [HttpGet("all")]
    public async Task<IActionResult> GetAllUniversityClasses()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        var classes = await _context.ClassWorkspaces.QueryAsync("WHERE \"IsDeleted\" = 0");

        var lecturerIds = classes.Where(c => c.LecturerId.HasValue).Select(c => c.LecturerId!.Value).Distinct().ToList();
        var lecturerMap = await LoadUsersByIdsAsync(lecturerIds);
        var counts = await LoadStudentsCountsAsync(classes.Select(c => c.Id).ToList());
        var enrolledClassIds = (dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.Administrator)
            ? classes.Select(c => c.Id).ToList()
            : await _context.GetEnrolledClassIdsAsync(userId);

        var result = classes.Select(c =>
        {
            lecturerMap.TryGetValue(c.LecturerId ?? Guid.Empty, out var lecturer);
            bool isEnrolled = dbUser.Role == UserRole.Administrator ||
                             dbUser.Role == UserRole.Lecturer ||
                             c.ClassRepresentativeId == userId ||
                             c.SecondClassRepresentativeId == userId ||
                             c.CreatedByUserId == userId ||
                             enrolledClassIds.Contains(c.Id);

            return new
            {
                c.Id,
                c.Name,
                c.Code,
                c.Description,
                c.CourseCode,
                c.DepartmentText,
                c.AcademicLevel,
                c.Semester,
                ClassRepresentativeId = c.ClassRepresentativeId,
                SecondClassRepresentativeId = c.SecondClassRepresentativeId,
                LecturerId = c.LecturerId,
                LecturerName = lecturer != null ? $"{lecturer.FirstName} {lecturer.LastName}" : "Unassigned",
                HasLecturer = c.LecturerId.HasValue,
                StudentsCount = counts.TryGetValue(c.Id, out var n) ? n : 0,
                CreatedByUserId = c.CreatedByUserId,
                IsEnrolled = isEnrolled
            };
        });

        return Ok(result);
    }

    // GET /api/classworkspaces/available — Returns classes with no assigned lecturer (for Lecturers to claim)
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableClasses()
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || dbUser.Role != UserRole.Lecturer)
            return Forbid();

        var classes = await _context.ClassWorkspaces.QueryAsync(
            "WHERE \"LecturerId\" IS NULL AND \"IsDeleted\" = 0");

        var creatorIds = classes.Where(c => c.CreatedByUserId.HasValue)
            .Select(c => c.CreatedByUserId!.Value).Distinct().ToList();
        var creatorMap = await LoadUsersByIdsAsync(creatorIds);
        var counts = await LoadStudentsCountsAsync(classes.Select(c => c.Id).ToList());

        var result = classes.Select(c =>
        {
            var creator = c.CreatedByUserId.HasValue && creatorMap.TryGetValue(c.CreatedByUserId.Value, out var u) ? u : null;
            return new
            {
                c.Id,
                c.Name,
                c.Code,
                c.Description,
                c.CourseCode,
                c.DepartmentText,
                c.AcademicLevel,
                c.Semester,
                CreatedBy = creator != null ? $"{creator.FirstName} {creator.LastName}" : "Unknown",
                StudentsCount = counts.TryGetValue(c.Id, out var n) ? n : 0
            };
        });

        return Ok(result);
    }

    // GET /api/classworkspaces/{id}/members — Returns roster of lecturer and enrolled students for a workspace
    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetClassMembers(Guid id)
    {
        var classWorkspace = await _context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });

        if (classWorkspace == null) return NotFound(new { Message = "Class workspace not found" });

        var lecturer = classWorkspace.LecturerId.HasValue ? await _context.Users.FindAsync(classWorkspace.LecturerId.Value) : null;
        var students = await _context.GetEnrolledStudentsAsync(classWorkspace.Id);

        var members = new
        {
            Lecturer = lecturer != null
                ? new { lecturer.Id, Name = $"{lecturer.FirstName} {lecturer.LastName}", lecturer.Email }
                : null,
            Students = students.Select(s => new
            {
                s.Id,
                Name = $"{s.FirstName} {s.LastName}",
                s.Email,
                s.StudentId,
                IsClassRepresentative = (classWorkspace.ClassRepresentativeId == s.Id || classWorkspace.SecondClassRepresentativeId == s.Id)
            })
        };

        return Ok(members);
    }

    // POST /api/classworkspaces — Lecturers or Course Reps create a new class workspace
    [HttpPost]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);

        if (dbUser == null)
            return Unauthorized();

        var normalizedCode = model.Code.Trim().ToUpper();
        if (await _context.ClassWorkspaces.AnyAsync(
            "WHERE \"Code\" = ? AND \"IsDeleted\" = 0",
            new object?[] { normalizedCode }))
            return BadRequest(new { Message = "A class with this code already exists" });

        var newClass = new ClassWorkspace
        {
            Id = Guid.NewGuid(),
            Name = model.Name,
            Code = normalizedCode,
            Description = model.Description ?? string.Empty,
            CourseCode = model.CourseCode,
            DepartmentText = model.Department,
            AcademicLevel = model.AcademicLevel,
            Semester = model.Semester,
            CreatedByUserId = userId,
            LecturerId = (dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.Administrator) ? userId : null,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        // Belt-and-braces: ensure the ClassWorkspaces table actually has every column the
        // entity writes (e.g. CreatedByUserId) BEFORE inserting. In-place additive ALTER,
        // safe under D1's enforced foreign keys and cheap. If repairer isn't available (or
        // fails), fall through so the request still attempts the insert in the normal way.
        if (_repairer != null)
        {
            try
            {
                await _repairer.EnsureTableColumnsAsync<ClassWorkspace>(_context);
            }
            catch (Exception selfHealEx)
            {
                Console.WriteLine($"[D1] CreateClass self-heal skipped: {selfHealEx.Message}");
            }
        }

        await _context.ClassWorkspaces.AddAsync(newClass);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetClassMembers), new { id = newClass.Id }, new
        {
            newClass.Id,
            newClass.Name,
            newClass.Code,
            newClass.Description,
            newClass.CourseCode,
            newClass.DepartmentText,
            newClass.AcademicLevel,
            newClass.Semester,
            LecturerName = dbUser.Role == UserRole.Lecturer ? $"{dbUser.FirstName} {dbUser.LastName}" : "Unassigned",
            HasLecturer = dbUser.Role == UserRole.Lecturer
        });
    }

    // POST /api/classworkspaces/{id}/claim — Lecturer claims an unassigned class workspace
    [HttpPost("{id}/claim")]
    public async Task<IActionResult> ClaimClass(Guid id)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null || dbUser.Role != UserRole.Lecturer)
            return Forbid();

        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);
        if (classWorkspace == null || classWorkspace.IsDeleted)
            return NotFound(new { Message = "Class not found" });

        if (classWorkspace.LecturerId.HasValue)
            return BadRequest(new { Message = "This class already has a lecturer assigned" });

        classWorkspace.LecturerId = userId;
        classWorkspace.UpdatedAt = DateTime.UtcNow;
        _context.ClassWorkspaces.Update(classWorkspace);
        await _context.SaveChangesAsync();

        var enrolledStudents = await _context.GetEnrolledStudentsAsync(classWorkspace.Id);
        foreach (var student in enrolledStudents)
        {
            await _context.Notifications.AddAsync(new Notification
            {
                Id = Guid.NewGuid(),
                Title = "Lecturer Assigned",
                Message = $"Dr. {dbUser.FirstName} {dbUser.LastName} has been assigned as lecturer for {classWorkspace.Name}.",
                Type = NotificationType.Alert,
                Priority = NotificationPriority.Normal,
                IsRead = false,
                UserId = student.Id,
                ClassWorkspaceId = classWorkspace.Id,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Class claimed successfully", ClassId = id, LecturerName = $"{dbUser.FirstName} {dbUser.LastName}" });
    }

    // POST /api/classworkspaces/join — Students or Course Reps join a class workspace using join code
    [HttpPost("join")]
    public async Task<IActionResult> JoinClass([FromBody] JoinClassModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        var normalizedCode = model.Code.Trim().ToUpper();
        var classWorkspace = await _context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE (upper(\"Code\") = ? OR upper(\"CourseCode\") = ?) AND \"IsDeleted\" = 0",
            new object?[] { normalizedCode, normalizedCode });

        if (classWorkspace == null)
            return NotFound(new { Message = "Invalid course code. Class not found." });

        if (!await _context.IsEnrolledAsync(classWorkspace.Id, userId))
        {
            _context.Enroll(classWorkspace.Id, userId);
            await _context.SaveChangesAsync();
        }

        var lecturer = classWorkspace.LecturerId.HasValue ? await _context.Users.FindAsync(classWorkspace.LecturerId.Value) : null;
        var studentsCount = await _context.CountEnrolledAsync(classWorkspace.Id);

        return Ok(new
        {
            classWorkspace.Id,
            classWorkspace.Name,
            classWorkspace.Code,
            classWorkspace.Description,
            classWorkspace.CourseCode,
            classWorkspace.DepartmentText,
            classWorkspace.AcademicLevel,
            classWorkspace.Semester,
            LecturerName = lecturer != null ? $"{lecturer.FirstName} {lecturer.LastName}" : "Unassigned",
            StudentsCount = studentsCount,
            IsEnrolled = true,
            Message = "Successfully enrolled in class workspace!"
        });
    }

    // POST /api/classworkspaces/{id}/invite — Sends invitation alert to student by email
    [HttpPost("{id}/invite")]
    public async Task<IActionResult> InviteStudent(Guid id, [FromBody] InviteStudentModel model)
    {
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);
        if (classWorkspace == null) return NotFound();

        var targetStudent = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Email\") = lower(?)",
            new object?[] { model.Email.Trim() });
        if (targetStudent == null)
            return NotFound(new { Message = "Student with this email not found" });

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            Title = "Class Invitation",
            Message = $"You have been invited to join the class {classWorkspace.Name} ({classWorkspace.Code}).",
            Type = NotificationType.Alert,
            Priority = NotificationPriority.Normal,
            IsRead = false,
            UserId = targetStudent.Id,
            ClassWorkspaceId = classWorkspace.Id,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Invitation sent successfully" });
    }

    // PUT /api/classworkspaces/{id} — Updates class workspace details
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateClass(Guid id, [FromBody] UpdateClassModel model)
    {
        var userId = GetCurrentUserId();
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);

        if (classWorkspace == null || classWorkspace.IsDeleted)
            return NotFound(new { Message = "Class workspace not found" });

        var dbUser = await _context.Users.FindAsync(userId);
        bool isStaff = dbUser != null && (dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.Administrator || dbUser.Role == UserRole.ClassRepresentative);
        bool isOwner = classWorkspace.LecturerId == userId || classWorkspace.CreatedByUserId == userId;

        if (!isStaff && !isOwner)
            return Forbid();

        if (!string.IsNullOrWhiteSpace(model.Name)) classWorkspace.Name = model.Name.Trim();
        if (!string.IsNullOrWhiteSpace(model.Code)) classWorkspace.Code = model.Code.Trim().ToUpper();
        if (!string.IsNullOrWhiteSpace(model.CourseCode)) classWorkspace.CourseCode = model.CourseCode.Trim().ToUpper();
        if (model.Description != null) classWorkspace.Description = model.Description;

        string? dept = !string.IsNullOrWhiteSpace(model.DepartmentText) ? model.DepartmentText : model.Department;
        if (!string.IsNullOrWhiteSpace(dept)) classWorkspace.DepartmentText = dept.Trim();

        if (!string.IsNullOrWhiteSpace(model.AcademicLevel)) classWorkspace.AcademicLevel = model.AcademicLevel.Trim();
        if (!string.IsNullOrWhiteSpace(model.Semester)) classWorkspace.Semester = model.Semester.Trim();
        classWorkspace.UpdatedAt = DateTime.UtcNow;

        _context.ClassWorkspaces.Update(classWorkspace);
        await _context.SaveChangesAsync();

        return Ok(classWorkspace);
    }

    // DELETE /api/classworkspaces/{id} — Soft-deletes a class workspace
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteClass(Guid id)
    {
        var userId = GetCurrentUserId();
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);

        if (classWorkspace == null || classWorkspace.IsDeleted)
            return NotFound(new { Message = "Class workspace not found" });

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null)
            return Unauthorized();

        bool isAuthorized = false;
        if (classWorkspace.LecturerId == userId) isAuthorized = true;
        if (classWorkspace.CreatedByUserId == userId) isAuthorized = true;
        if (dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.ClassRepresentative) isAuthorized = true;

        if (!isAuthorized)
            return Forbid();

        classWorkspace.IsDeleted = true;
        classWorkspace.DeletedAt = DateTime.UtcNow;

        _context.ClassWorkspaces.Update(classWorkspace);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Class workspace deleted successfully" });
    }

    // POST /api/classworkspaces/{id}/assign-rep — Appoints a Course Representative (allows 1 or up to 2 Reps per class)
    [HttpPost("{id}/assign-rep")]
    public async Task<IActionResult> AssignRepresentative(Guid id, [FromBody] AssignRepModel model)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null)
            return Unauthorized();

        var classWorkspace = await _context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });

        if (classWorkspace == null)
            return NotFound(new { Message = "Class workspace not found" });

        bool isClassLecturer = (classWorkspace.LecturerId.HasValue && classWorkspace.LecturerId.Value == userId) || 
                               (classWorkspace.CreatedByUserId.HasValue && classWorkspace.CreatedByUserId.Value == userId);
        bool isAuthorized = isClassLecturer || dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.Administrator;

        if (!isAuthorized)
            return Forbid();

        var targetStudent = await _context.Users.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { model.StudentId });
        if (targetStudent == null)
            return NotFound(new { Message = "Student not found" });

        if (!await _context.IsEnrolledAsync(classWorkspace.Id, model.StudentId))
            return BadRequest(new { Message = "User is not enrolled in this class workspace." });

        if (classWorkspace.ClassRepresentativeId == model.StudentId || classWorkspace.SecondClassRepresentativeId == model.StudentId)
            return BadRequest(new { Message = "User is already a Course Representative for this class workspace." });

        if (classWorkspace.ClassRepresentativeId == null)
        {
            classWorkspace.ClassRepresentativeId = model.StudentId;
        }
        else if (classWorkspace.SecondClassRepresentativeId == null)
        {
            classWorkspace.SecondClassRepresentativeId = model.StudentId;
        }
        else
        {
            return BadRequest(new { Message = "This class workspace already has 2 Course Representatives (maximum limit reached). Please remove an existing representative first." });
        }

        targetStudent.Role = UserRole.ClassRepresentative;

        _context.ClassWorkspaces.Update(classWorkspace);
        _context.Users.Update(targetStudent);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Course Representative assigned successfully.", RepresentativeId = model.StudentId });
    }

    // POST /api/classworkspaces/{id}/remove-rep — Removes a Course Representative from a class workspace
    [HttpPost("{id}/remove-rep")]
    public async Task<IActionResult> RemoveRepresentative(Guid id, [FromBody] RemoveRepModel? model = null)
    {
        var userId = GetCurrentUserId();
        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null)
            return Unauthorized();

        var classWorkspace = await _context.ClassWorkspaces.QueryFirstOrDefaultAsync(
            "WHERE lower(\"Id\") = lower(?) AND \"IsDeleted\" = 0",
            new object?[] { id });
        if (classWorkspace == null)
            return NotFound(new { Message = "Class workspace not found" });

        bool isClassLecturer = (classWorkspace.LecturerId.HasValue && classWorkspace.LecturerId.Value == userId) || 
                               (classWorkspace.CreatedByUserId.HasValue && classWorkspace.CreatedByUserId.Value == userId);
        bool isAuthorized = isClassLecturer || dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.Administrator;

        if (!isAuthorized)
            return Forbid();

        if (classWorkspace.ClassRepresentativeId == null && classWorkspace.SecondClassRepresentativeId == null)
            return BadRequest(new { Message = "No representative assigned to this class workspace." });

        Guid? repIdToRemove = model?.StudentId;

        if (repIdToRemove.HasValue && repIdToRemove.Value != Guid.Empty)
        {
            if (classWorkspace.ClassRepresentativeId == repIdToRemove.Value)
            {
                classWorkspace.ClassRepresentativeId = null;
            }
            else if (classWorkspace.SecondClassRepresentativeId == repIdToRemove.Value)
            {
                classWorkspace.SecondClassRepresentativeId = null;
            }
            else
            {
                return BadRequest(new { Message = "Specified user is not a Course Representative for this class workspace." });
            }
        }
        else
        {
            if (classWorkspace.SecondClassRepresentativeId.HasValue)
            {
                repIdToRemove = classWorkspace.SecondClassRepresentativeId.Value;
                classWorkspace.SecondClassRepresentativeId = null;
            }
            else if (classWorkspace.ClassRepresentativeId.HasValue)
            {
                repIdToRemove = classWorkspace.ClassRepresentativeId.Value;
                classWorkspace.ClassRepresentativeId = null;
            }
        }

        if (repIdToRemove.HasValue)
        {
            var removedRepId = repIdToRemove.Value;
            var isRepElsewhere = await _context.ClassWorkspaces.AnyAsync(
                "WHERE ((\"ClassRepresentativeId\" IS NOT NULL AND lower(\"ClassRepresentativeId\") = lower(?)) OR " +
                "(\"SecondClassRepresentativeId\" IS NOT NULL AND lower(\"SecondClassRepresentativeId\") = lower(?))) " +
                "AND lower(\"Id\") != lower(?) AND \"IsDeleted\" = 0",
                new object?[] { removedRepId, removedRepId, id });

            if (!isRepElsewhere)
            {
                var repUser = await _context.Users.FindAsync(removedRepId);
                if (repUser != null)
                {
                    repUser.Role = UserRole.Student;
                    _context.Users.Update(repUser);
                }
            }
        }

        _context.ClassWorkspaces.Update(classWorkspace);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Representative removed successfully." });
    }
}

public class CreateClassModel
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CourseCode { get; set; }
    public string? Department { get; set; }
    public string? AcademicLevel { get; set; }
    public string? Semester { get; set; }
}

public class UpdateClassModel
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public string? CourseCode { get; set; }
    public string? Department { get; set; }
    public string? DepartmentText { get; set; }
    public string? AcademicLevel { get; set; }
    public string? Semester { get; set; }
}

public class JoinClassModel
{
    public string Code { get; set; } = string.Empty;
}

public class InviteStudentModel
{
    public string Email { get; set; } = string.Empty;
}

public class AssignRepModel
{
    public Guid StudentId { get; set; }
}

public class RemoveRepModel
{
    public Guid? StudentId { get; set; }
}
