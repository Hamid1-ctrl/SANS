// Import ASP.NET Core authorization namespace for securing controller endpoints
using Microsoft.AspNetCore.Authorization;
// Import ASP.NET Core MVC framework namespace for API controller attributes and action results
using Microsoft.AspNetCore.Mvc;
// Import Entity Framework Core namespace for async database queries and inclusions
using Microsoft.EntityFrameworkCore;
// Import SANS domain entities namespace for database entity models
using SANS.Domain.Entities;
// Import SANS domain enums namespace for role and account status definitions
using SANS.Domain.Enums;
// Import SANS infrastructure data namespace for AppDbContext database context access
using SANS.Infrastructure.Data;
// Import System Security Claims namespace to extract user identity claims from JWT tokens
using System.Security.Claims;

// Define the namespace for SANS Web API controllers
namespace SANS.WebAPI.Controllers;

// Attribute indicating that this class is an API Controller with automated model validation
[ApiController]
// Set the routing path for this controller to /api/classworkspaces
[Route("api/[controller]")]
// Enforce JWT token authentication on all endpoints in this controller by default
[Authorize]
// ClassWorkspacesController handles class workspace management, enrollments, and representative appointments
public class ClassWorkspacesController : ControllerBase
{
    // Private read-only field holding the Entity Framework database context instance
    private readonly AppDbContext _context;

    // Constructor injecting the application database context instance
    public ClassWorkspacesController(AppDbContext context)
    {
        // Assign the injected context to the private controller field
        _context = context;
    }

    // Private helper method to extract the authenticated user's GUID ID from JWT claims
    private Guid GetCurrentUserId()
    {
        // Find the NameIdentifier claim from the current user's security principal
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        // Parse the claim string value to a Guid if present, otherwise return Guid.Empty
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    // GET /api/classworkspaces — Returns class workspaces belonging to or relevant for the current user
    [HttpGet]
    public async Task<IActionResult> GetMyClasses()
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Return 401 Unauthorized if user ID claim is invalid or missing
        if (userId == Guid.Empty) return Unauthorized();

        // Query database to fetch current user's profile record
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 404 Not Found if user record does not exist
        if (dbUser == null) return NotFound();

        // Declare list variable to hold fetched class workspaces
        List<ClassWorkspace> classes;

        // Check if the authenticated user is a Lecturer
        if (dbUser.Role == UserRole.Lecturer)
        {
            // Lecturers see classes where they are the assigned lecturer or creator
            classes = await _context.ClassWorkspaces
                // Include assigned lecturer navigation property
                .Include(c => c.Lecturer)
                // Filter for active non-deleted classes where lecturer ID or creator ID matches user ID
                .Where(c => (c.LecturerId == userId || c.CreatedByUserId == userId) && !c.IsDeleted)
                // Execute query asynchronously to return list
                .ToListAsync();
        }
        else
        {
            // Students and Reps see classes they are enrolled in, represent as 1st/2nd Rep, or created
            classes = await _context.ClassWorkspaces
                // Include assigned lecturer navigation property
                .Include(c => c.Lecturer)
                // Filter for active non-deleted classes where student is enrolled or assigned as Rep 1 or Rep 2
                .Where(c => (c.Students.Any(s => s.Id == userId) || c.ClassRepresentativeId == userId || c.SecondClassRepresentativeId == userId || c.CreatedByUserId == userId) && !c.IsDeleted)
                // Execute query asynchronously to return list
                .ToListAsync();
        }

        // Fallback check: if user has no explicitly assigned classes, return all active class workspaces
        if (classes.Count == 0)
        {
            // Fetch all active non-deleted class workspaces with lecturer info
            classes = await _context.ClassWorkspaces
                // Include assigned lecturer navigation property
                .Include(c => c.Lecturer)
                // Filter out soft-deleted class workspaces
                .Where(c => !c.IsDeleted)
                // Execute query asynchronously to return list
                .ToListAsync();
        }

        // Map class workspace entity list into clean anonymous DTO response format
        var result = classes.Select(c => new
        {
            // Unique class workspace ID
            c.Id,
            // Class workspace display name
            c.Name,
            // Unique join code for student enrollment
            c.Code,
            // Workspace description
            c.Description,
            // Course code identifier
            c.CourseCode,
            // Department name
            c.DepartmentText,
            // Academic level
            c.AcademicLevel,
            // Academic semester
            c.Semester,
            // 1st Course Representative user ID
            ClassRepresentativeId = c.ClassRepresentativeId,
            // 2nd Course Representative user ID
            SecondClassRepresentativeId = c.SecondClassRepresentativeId,
            // Primary lecturer user ID
            LecturerId = c.LecturerId,
            // Lecturer full display name string
            LecturerName = c.Lecturer != null ? $"{c.Lecturer.FirstName} {c.Lecturer.LastName}" : "Unassigned",
            // Boolean flag indicating whether a lecturer is assigned
            HasLecturer = c.LecturerId.HasValue,
            // Count of currently enrolled students in this workspace
            StudentsCount = _context.Entry(c).Collection(x => x.Students).Query().Count(),
            // User ID of original workspace creator
            CreatedByUserId = c.CreatedByUserId
        });

        // Return 200 OK with formatted list of class workspaces
        return Ok(result);
    }

    // GET /api/classworkspaces/available — Returns classes with no assigned lecturer (for Lecturers to claim)
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableClasses()
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch current user record from database
        var dbUser = await _context.Users.FindAsync(userId);
        // Enforce that only authenticated Lecturers can access unassigned classes list
        if (dbUser == null || dbUser.Role != UserRole.Lecturer)
            // Return 403 Forbidden
            return Forbid();

        // Query database for active classes that have no assigned lecturer
        var classes = await _context.ClassWorkspaces
            // Filter where LecturerId is null and class is not soft-deleted
            .Where(c => c.LecturerId == null && !c.IsDeleted)
            // Execute query asynchronously
            .ToListAsync();

        // Extract distinct creator user IDs for available classes
        var creatorIds = classes.Where(c => c.CreatedByUserId.HasValue)
            // Select non-null creator IDs
            .Select(c => c.CreatedByUserId!.Value).Distinct().ToList();
        // Fetch full names of creators mapped by user ID
        var creators = await _context.Users
            // Filter users by collected creator IDs
            .Where(u => creatorIds.Contains(u.Id))
            // Convert to dictionary of ID to full name string
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}");

        // Map available class workspace entities to DTO response format
        var result = classes.Select(c => new
        {
            // Class workspace ID
            c.Id,
            // Workspace display name
            c.Name,
            // Join code
            c.Code,
            // Description text
            c.Description,
            // Course code
            c.CourseCode,
            // Department name
            c.DepartmentText,
            // Academic level
            c.AcademicLevel,
            // Semester designation
            c.Semester,
            // Creator full name string or fallback "Unknown"
            CreatedBy = c.CreatedByUserId.HasValue && creators.ContainsKey(c.CreatedByUserId.Value)
                ? creators[c.CreatedByUserId.Value] : "Unknown",
            // Count of enrolled students
            StudentsCount = _context.Entry(c).Collection(x => x.Students).Query().Count()
        });

        // Return 200 OK with list of available unassigned classes
        return Ok(result);
    }

    // GET /api/classworkspaces/{id}/members — Returns roster of lecturer and enrolled students for a workspace
    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetClassMembers(Guid id)
    {
        // Query database for target class workspace with lecturer and student collections included
        var classWorkspace = await _context.ClassWorkspaces
            // Include assigned lecturer object
            .Include(c => c.Lecturer)
            // Include enrolled students collection
            .Include(c => c.Students)
            // Find first matching active workspace by ID
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

        // Return 404 Not Found if workspace does not exist or is deleted
        if (classWorkspace == null) return NotFound(new { Message = "Class workspace not found" });

        // Build member list response object
        var members = new
        {
            // Lecturer information object or null if unassigned
            Lecturer = classWorkspace.Lecturer != null
                ? new { classWorkspace.Lecturer.Id, Name = $"{classWorkspace.Lecturer.FirstName} {classWorkspace.Lecturer.LastName}", classWorkspace.Lecturer.Email }
                : null,
            // Enrolled students list with Course Representative status flag (matches 1st or 2nd Rep)
            Students = classWorkspace.Students.Select(s => new { 
                // Student user ID
                s.Id, 
                // Student full name
                Name = $"{s.FirstName} {s.LastName}", 
                // Student email address
                s.Email, 
                // Student index or ID number
                s.StudentId,
                // True if student is assigned as 1st or 2nd Course Representative for this class
                IsClassRepresentative = (classWorkspace.ClassRepresentativeId == s.Id || classWorkspace.SecondClassRepresentativeId == s.Id)
            })
        };

        // Return 200 OK with workspace members data
        return Ok(members);
    }

    // POST /api/classworkspaces — Lecturers or Course Reps create a new class workspace
    [HttpPost]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassModel model)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch creator user record from database
        var dbUser = await _context.Users.FindAsync(userId);

        // Return 404 Not Found if creator user record does not exist
        if (dbUser == null)
            return NotFound();

        // Enforce that only Lecturers or Course Representatives can create class workspaces
        if (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.ClassRepresentative)
            // Return 403 Forbidden
            return Forbid();

        // Normalize join code to uppercase trimmed string
        var normalizedCode = model.Code.Trim().ToUpper();
        // Verify no duplicate active class code exists in database
        if (await _context.ClassWorkspaces.AnyAsync(c => c.Code == normalizedCode && !c.IsDeleted))
            // Return 400 Bad Request if code is already taken
            return BadRequest(new { Message = "A class with this code already exists" });

        // Instantiate new ClassWorkspace entity
        var newClass = new ClassWorkspace
        {
            // Generate new unique GUID
            Id = Guid.NewGuid(),
            // Workspace display name
            Name = model.Name,
            // Normalized join code
            Code = normalizedCode,
            // Description text
            Description = model.Description ?? string.Empty,
            // Course code
            CourseCode = model.CourseCode,
            // Department name text
            DepartmentText = model.Department,
            // Academic level
            AcademicLevel = model.AcademicLevel,
            // Semester
            Semester = model.Semester,
            // Creator user ID
            CreatedByUserId = userId,
            // Assign creator as lecturer if user is Lecturer, otherwise leave lecturer slot open
            LecturerId = dbUser.Role == UserRole.Lecturer ? userId : null,
            // Set creation timestamp to UTC now
            CreatedAt = DateTime.UtcNow,
            // Set soft deletion flag to false
            IsDeleted = false
        };

        // Add new class workspace entity to database set
        await _context.ClassWorkspaces.AddAsync(newClass);
        // Persist database changes asynchronously
        await _context.SaveChangesAsync();

        // Return 201 Created response with created workspace details
        return CreatedAtAction(nameof(GetClassMembers), new { id = newClass.Id }, new
        {
            // Class workspace ID
            newClass.Id,
            // Workspace name
            newClass.Name,
            // Join code
            newClass.Code,
            // Description
            newClass.Description,
            // Course code
            newClass.CourseCode,
            // Department text
            newClass.DepartmentText,
            // Academic level
            newClass.AcademicLevel,
            // Semester
            newClass.Semester,
            // Lecturer name or Unassigned string
            LecturerName = dbUser.Role == UserRole.Lecturer ? $"{dbUser.FirstName} {dbUser.LastName}" : "Unassigned",
            // Boolean indicating lecturer status
            HasLecturer = dbUser.Role == UserRole.Lecturer
        });
    }

    // POST /api/classworkspaces/{id}/claim — Lecturer claims an unassigned class workspace
    [HttpPost("{id}/claim")]
    public async Task<IActionResult> ClaimClass(Guid id)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch current user record from database
        var dbUser = await _context.Users.FindAsync(userId);
        // Enforce that only Lecturers can claim unassigned class workspaces
        if (dbUser == null || dbUser.Role != UserRole.Lecturer)
            // Return 403 Forbidden
            return Forbid();

        // Find target class workspace record by ID
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);
        // Return 404 Not Found if workspace does not exist or is soft-deleted
        if (classWorkspace == null || classWorkspace.IsDeleted)
            // Return 404 Not Found
            return NotFound(new { Message = "Class not found" });

        // Return 400 Bad Request if workspace already has an assigned lecturer
        if (classWorkspace.LecturerId.HasValue)
            // Return 400 Bad Request
            return BadRequest(new { Message = "This class already has a lecturer assigned" });

        // Assign current lecturer ID to the workspace
        classWorkspace.LecturerId = userId;
        // Update modification timestamp
        classWorkspace.UpdatedAt = DateTime.UtcNow;
        // Persist database changes
        await _context.SaveChangesAsync();

        // Query enrolled students to send assignment alert notification
        var enrolledStudents = await _context.ClassWorkspaces
            // Include enrolled students collection
            .Include(c => c.Students)
            // Filter by target workspace ID
            .Where(c => c.Id == id)
            // Flatten student collection
            .SelectMany(c => c.Students)
            // Execute list query asynchronously
            .ToListAsync();

        // Iterate through enrolled students to create notification records
        foreach (var student in enrolledStudents)
        {
            // Add new notification record for each student
            await _context.Notifications.AddAsync(new Notification
            {
                // Unique notification GUID
                Id = Guid.NewGuid(),
                // Notification title
                Title = "Lecturer Assigned",
                // Notification message text
                Message = $"Dr. {dbUser.FirstName} {dbUser.LastName} has been assigned as lecturer for {classWorkspace.Name}.",
                // Alert type
                Type = NotificationType.Alert,
                // Normal priority
                Priority = NotificationPriority.Normal,
                // Initial unread status
                IsRead = false,
                // Recipient student user ID
                UserId = student.Id,
                // Class workspace context ID
                ClassWorkspaceId = classWorkspace.Id,
                // Creation timestamp
                CreatedAt = DateTime.UtcNow
            });
        }
        // Save added notifications to database
        await _context.SaveChangesAsync();

        // Return 200 OK success result
        return Ok(new { Message = "Class claimed successfully", ClassId = id, LecturerName = $"{dbUser.FirstName} {dbUser.LastName}" });
    }

    // POST /api/classworkspaces/join — Students or Course Reps join a class workspace using join code
    [HttpPost("join")]
    public async Task<IActionResult> JoinClass([FromBody] JoinClassModel model)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch current user with enrolled classes collection included
        var dbUser = await _context.Users.Include(u => u.EnrolledClasses).FirstOrDefaultAsync(u => u.Id == userId);
        // Return 404 Not Found if user does not exist
        if (dbUser == null) return NotFound();

        // Trim and uppercase input join code
        var normalizedCode = model.Code.Trim().ToUpper();
        // Query target active class workspace matching join code
        var classWorkspace = await _context.ClassWorkspaces
            // Include enrolled students
            .Include(c => c.Students)
            // Include assigned lecturer
            .Include(c => c.Lecturer)
            // Find first matching active record
            .FirstOrDefaultAsync(c => c.Code == normalizedCode && !c.IsDeleted);

        // Return 404 Not Found if no active workspace matches the provided code
        if (classWorkspace == null)
            // Return 404 Not Found
            return NotFound(new { Message = "Class with this code not found" });

        // Check if student is already enrolled in this workspace
        if (classWorkspace.Students.Any(s => s.Id == userId))
            // Return 400 Bad Request if already enrolled
            return BadRequest(new { Message = "You are already enrolled in this class" });

        // Add user to workspace enrolled students collection
        classWorkspace.Students.Add(dbUser);
        // Persist enrollment changes to database
        await _context.SaveChangesAsync();

        // Return 200 OK with joined class details
        return Ok(new
        {
            // Workspace ID
            classWorkspace.Id,
            // Workspace name
            classWorkspace.Name,
            // Join code
            classWorkspace.Code,
            // Description
            classWorkspace.Description,
            // Course code
            classWorkspace.CourseCode,
            // Department text
            classWorkspace.DepartmentText,
            // Academic level
            classWorkspace.AcademicLevel,
            // Semester
            classWorkspace.Semester,
            // Lecturer name string
            LecturerName = classWorkspace.Lecturer != null
                ? $"{classWorkspace.Lecturer.FirstName} {classWorkspace.Lecturer.LastName}" : "Unassigned",
            // Updated total enrolled students count
            StudentsCount = classWorkspace.Students.Count
        });
    }

    // POST /api/classworkspaces/{id}/invite — Sends invitation alert to student by email
    [HttpPost("{id}/invite")]
    public async Task<IActionResult> InviteStudent(Guid id, [FromBody] InviteStudentModel model)
    {
        // Find target class workspace by ID
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);
        // Return 404 Not Found if workspace does not exist
        if (classWorkspace == null) return NotFound();

        // Query user record matching invited email address
        var targetStudent = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == model.Email.Trim().ToLower());
        // Return 404 Not Found if no user account matches email
        if (targetStudent == null)
            // Return 404 Not Found
            return NotFound(new { Message = "Student with this email not found" });

        // Create invitation notification record for target student
        var notification = new Notification
        {
            // Unique GUID
            Id = Guid.NewGuid(),
            // Title
            Title = "Class Invitation",
            // Notification message text
            Message = $"You have been invited to join the class {classWorkspace.Name} ({classWorkspace.Code}).",
            // Alert notification type
            Type = NotificationType.Alert,
            // Normal priority
            Priority = NotificationPriority.Normal,
            // Initial unread status
            IsRead = false,
            // Target recipient student ID
            UserId = targetStudent.Id,
            // Workspace ID
            ClassWorkspaceId = classWorkspace.Id,
            // Creation timestamp
            CreatedAt = DateTime.UtcNow
        };

        // Add notification record to database context
        await _context.Notifications.AddAsync(notification);
        // Save database changes
        await _context.SaveChangesAsync();

        // Return 200 OK success message
        return Ok(new { Message = "Invitation sent successfully" });
    }

    // PUT /api/classworkspaces/{id} — Updates class workspace details
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateClass(Guid id, [FromBody] UpdateClassModel model)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch target class workspace record by ID
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);

        // Return 404 Not Found if class workspace does not exist or is soft-deleted
        if (classWorkspace == null || classWorkspace.IsDeleted)
            // Return 404 Not Found
            return NotFound(new { Message = "Class workspace not found" });

        // Only the assigned lecturer or workspace creator can update workspace details
        if (classWorkspace.LecturerId != userId && classWorkspace.CreatedByUserId != userId)
            // Return 403 Forbidden
            return Forbid();

        // Update workspace property values from request model
        classWorkspace.Name = model.Name;
        // Update description
        classWorkspace.Description = model.Description ?? string.Empty;
        // Update course code
        classWorkspace.CourseCode = model.CourseCode;
        // Update department text
        classWorkspace.DepartmentText = model.Department;
        // Update academic level
        classWorkspace.AcademicLevel = model.AcademicLevel;
        // Update semester
        classWorkspace.Semester = model.Semester;
        // Update modification timestamp
        classWorkspace.UpdatedAt = DateTime.UtcNow;

        // Persist database changes
        await _context.SaveChangesAsync();

        // Return 200 OK with updated class workspace entity
        return Ok(classWorkspace);
    }

    // DELETE /api/classworkspaces/{id} — Soft-deletes a class workspace
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteClass(Guid id)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Find target class workspace record by ID
        var classWorkspace = await _context.ClassWorkspaces.FindAsync(id);

        // Return 404 Not Found if workspace does not exist or is already soft-deleted
        if (classWorkspace == null || classWorkspace.IsDeleted)
            // Return 404 Not Found
            return NotFound(new { Message = "Class workspace not found" });

        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 401 Unauthorized if user record does not exist
        if (dbUser == null)
            // Return 401 Unauthorized
            return Unauthorized();

        // Declare boolean flag for workspace deletion authorization
        bool isAuthorized = false;
        // Assigned lecturer is authorized
        if (classWorkspace.LecturerId == userId) isAuthorized = true;
        // Workspace creator is authorized
        if (classWorkspace.CreatedByUserId == userId) isAuthorized = true;
        // Lecturers or Reps are authorized
        if (dbUser.Role == UserRole.Lecturer || dbUser.Role == UserRole.ClassRepresentative) isAuthorized = true;

        // Return 403 Forbidden if user is not authorized to delete workspace
        if (!isAuthorized)
            // Return 403 Forbidden
            return Forbid();

        // Set soft deletion flag to true
        classWorkspace.IsDeleted = true;
        // Set deletion timestamp to UTC now
        classWorkspace.DeletedAt = DateTime.UtcNow;

        // Persist database changes
        await _context.SaveChangesAsync();

        // Return 200 OK success message
        return Ok(new { Message = "Class workspace deleted successfully" });
    }

    // POST /api/classworkspaces/{id}/assign-rep — Appoints a Course Representative (allows 1 or up to 2 Reps per class)
    [HttpPost("{id}/assign-rep")]
    public async Task<IActionResult> AssignRepresentative(Guid id, [FromBody] AssignRepModel model)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch executing user record from database
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 401 Unauthorized if user record does not exist
        if (dbUser == null)
            // Return 401 Unauthorized
            return Unauthorized();

        // Prevent pending or unverified lecturers from appointing Course Representatives
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
            // Return 403 Forbidden
            return Forbid();

        // Query active class workspace with enrolled students included
        var classWorkspace = await _context.ClassWorkspaces
            // Include enrolled students
            .Include(c => c.Students)
            // Find first matching active record
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

        // Return 404 Not Found if class workspace does not exist
        if (classWorkspace == null)
            // Return 404 Not Found
            return NotFound(new { Message = "Class workspace not found" });

        // Only the assigned lecturer of the class or an Administrator can appoint representatives
        if (classWorkspace.LecturerId != userId && dbUser.Role != UserRole.Administrator)
            // Return 403 Forbidden
            return Forbid();

        // Query target student record by student ID from request body
        var targetStudent = await _context.Users.FirstOrDefaultAsync(u => u.Id == model.StudentId && !u.IsDeleted);
        // Return 404 Not Found if target student user does not exist
        if (targetStudent == null)
            // Return 404 Not Found
            return NotFound(new { Message = "Student not found" });

        // Verify target student is enrolled in this class workspace
        if (!classWorkspace.Students.Any(s => s.Id == model.StudentId))
            // Return 400 Bad Request if student is not enrolled in class
            return BadRequest(new { Message = "User is not enrolled in this class workspace." });

        // Check if student is already assigned as 1st or 2nd representative for this class
        if (classWorkspace.ClassRepresentativeId == model.StudentId || classWorkspace.SecondClassRepresentativeId == model.StudentId)
            // Return 400 Bad Request if student is already a representative
            return BadRequest(new { Message = "User is already a Course Representative for this class workspace." });

        // Assign student to 1st or 2nd representative slot (maximum 2 representatives per class workspace)
        if (classWorkspace.ClassRepresentativeId == null)
        {
            // Assign to 1st representative slot if empty
            classWorkspace.ClassRepresentativeId = model.StudentId;
        }
        else if (classWorkspace.SecondClassRepresentativeId == null)
        {
            // Assign to 2nd representative slot if empty
            classWorkspace.SecondClassRepresentativeId = model.StudentId;
        }
        else
        {
            // Return 400 Bad Request if both 1st and 2nd slots are already occupied (max 2 limit)
            return BadRequest(new { Message = "This class workspace already has 2 Course Representatives (maximum limit reached). Please remove an existing representative first." });
        }
        
        // Elevate target student's global user role to ClassRepresentative
        targetStudent.Role = UserRole.ClassRepresentative;

        // Persist appointment changes to database
        await _context.SaveChangesAsync();

        // Return 200 OK success response with appointed representative ID
        return Ok(new { Message = "Course Representative assigned successfully.", RepresentativeId = model.StudentId });
    }

    // POST /api/classworkspaces/{id}/remove-rep — Removes a Course Representative from a class workspace
    [HttpPost("{id}/remove-rep")]
    public async Task<IActionResult> RemoveRepresentative(Guid id, [FromBody] RemoveRepModel? model = null)
    {
        // Extract current authenticated user ID
        var userId = GetCurrentUserId();
        // Fetch executing user record from database
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 401 Unauthorized if user record does not exist
        if (dbUser == null)
            // Return 401 Unauthorized
            return Unauthorized();

        // Prevent pending or unverified lecturers from removing Course Representatives
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
            // Return 403 Forbidden
            return Forbid();

        // Query target active class workspace record by ID
        var classWorkspace = await _context.ClassWorkspaces.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
        // Return 404 Not Found if workspace does not exist
        if (classWorkspace == null)
            // Return 404 Not Found
            return NotFound(new { Message = "Class workspace not found" });

        // Only the assigned lecturer of the class or an Administrator can remove representatives
        if (classWorkspace.LecturerId != userId && dbUser.Role != UserRole.Administrator)
            // Return 403 Forbidden
            return Forbid();

        // Verify that at least one representative is assigned to this workspace
        if (classWorkspace.ClassRepresentativeId == null && classWorkspace.SecondClassRepresentativeId == null)
            // Return 400 Bad Request if no representatives exist
            return BadRequest(new { Message = "No representative assigned to this class workspace." });

        // Declare variable to hold target representative user ID to remove
        Guid? repIdToRemove = model?.StudentId;

        // Check if a specific student ID was specified for removal
        if (repIdToRemove.HasValue && repIdToRemove.Value != Guid.Empty)
        {
            // Check if specified student matches 1st representative slot
            if (classWorkspace.ClassRepresentativeId == repIdToRemove.Value)
            {
                // Clear 1st representative slot
                classWorkspace.ClassRepresentativeId = null;
            }
            // Check if specified student matches 2nd representative slot
            else if (classWorkspace.SecondClassRepresentativeId == repIdToRemove.Value)
            {
                // Clear 2nd representative slot
                classWorkspace.SecondClassRepresentativeId = null;
            }
            else
            {
                // Return 400 Bad Request if specified student is not a representative for this class
                return BadRequest(new { Message = "Specified user is not a Course Representative for this class workspace." });
            }
        }
        else
        {
            // Default removal logic when no specific student ID is provided: remove 2nd rep if present, else 1st rep
            if (classWorkspace.SecondClassRepresentativeId.HasValue)
            {
                // Store 2nd representative ID to check for demotion
                repIdToRemove = classWorkspace.SecondClassRepresentativeId.Value;
                // Clear 2nd representative slot
                classWorkspace.SecondClassRepresentativeId = null;
            }
            else if (classWorkspace.ClassRepresentativeId.HasValue)
            {
                // Store 1st representative ID to check for demotion
                repIdToRemove = classWorkspace.ClassRepresentativeId.Value;
                // Clear 1st representative slot
                classWorkspace.ClassRepresentativeId = null;
            }
        }

        // Revert user role to Student if they are no longer representative of ANY OTHER active class workspace
        if (repIdToRemove.HasValue)
        {
            // Extract Guid value
            var removedRepId = repIdToRemove.Value;
            // Query database to check if user represents any other active class workspace as 1st or 2nd Rep
            var isRepElsewhere = await _context.ClassWorkspaces
                .AnyAsync(c => (c.ClassRepresentativeId == removedRepId || c.SecondClassRepresentativeId == removedRepId) && c.Id != id && !c.IsDeleted);

            // Revert global user role to Student if user is not a representative anywhere else
            if (!isRepElsewhere)
            {
                // Fetch user record for removed representative
                var repUser = await _context.Users.FindAsync(removedRepId);
                // If user record exists, revert role
                if (repUser != null)
                {
                    // Set role back to Student
                    repUser.Role = UserRole.Student;
                }
            }
        }

        // Save representative removal changes to database
        await _context.SaveChangesAsync();

        // Return 200 OK success message
        return Ok(new { Message = "Representative removed successfully." });
    }
}

// Request Models for Class Workspace Operations

// Model representing class workspace creation request body
public class CreateClassModel
{
    // Class name property
    public string Name { get; set; } = string.Empty;
    // Join code property
    public string Code { get; set; } = string.Empty;
    // Description text property
    public string? Description { get; set; }
    // Course code property
    public string? CourseCode { get; set; }
    // Department text property
    public string? Department { get; set; }
    // Academic level property
    public string? AcademicLevel { get; set; }
    // Semester property
    public string? Semester { get; set; }
}

// Model representing class workspace update request body
public class UpdateClassModel
{
    // Class name property
    public string Name { get; set; } = string.Empty;
    // Description text property
    public string? Description { get; set; }
    // Course code property
    public string? CourseCode { get; set; }
    // Department text property
    public string? Department { get; set; }
    // Academic level property
    public string? AcademicLevel { get; set; }
    // Semester property
    public string? Semester { get; set; }
}

// Model representing class workspace join request body
public class JoinClassModel
{
    // Join code property
    public string Code { get; set; } = string.Empty;
}

// Model representing student invitation request body
public class InviteStudentModel
{
    // Student email address property
    public string Email { get; set; } = string.Empty;
}

// Model representing Course Representative appointment request body
public class AssignRepModel
{
    // Student user GUID ID property to appoint as Course Representative
    public Guid StudentId { get; set; }
}

// Model representing Course Representative removal request body
public class RemoveRepModel
{
    // Optional student user GUID ID property to remove as Course Representative
    public Guid? StudentId { get; set; }
}
