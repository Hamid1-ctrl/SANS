// Import ASP.NET Core authorization namespace for securing API endpoints
using Microsoft.AspNetCore.Authorization;
// Import ASP.NET Core MVC framework namespace for API controllers and action results
using Microsoft.AspNetCore.Mvc;
// Import System Security Claims namespace to extract user identity claims
using System.Security.Claims;
// Import SANS application interfaces namespace for UnitOfWork access
using SANS.Application.Interfaces;
// Import SANS application services namespace for storage service access
using SANS.Application.Interfaces.Services;
// Import SANS domain entities namespace for database entity models
using SANS.Domain.Entities;
// Import SANS domain enums namespace for user roles and account statuses
using SANS.Domain.Enums;
// Import Entity Framework Core namespace for async querying
using Microsoft.EntityFrameworkCore;

// Define namespace for SANS Web API controllers
namespace SANS.WebAPI.Controllers;

// Attribute indicating that this class is an API Controller
[ApiController]
// Set routing path to /api/resources
[Route("api/[controller]")]
// Require JWT authentication by default for all endpoints
[Authorize]
// ResourcesController handles learning resource uploads, retrievals, and downloads
public class ResourcesController : ControllerBase
{
    // Private read-only UnitOfWork interface instance
    private readonly IUnitOfWork _unitOfWork;
    // Private read-only database context instance
    private readonly SANS.Infrastructure.Data.AppDbContext _context;
    // Private read-only cloud storage service instance (Cloudflare R2)
    private readonly IStorageService _storageService;

    // Constructor injecting UnitOfWork, AppDbContext, and IStorageService
    public ResourcesController(IUnitOfWork unitOfWork, SANS.Infrastructure.Data.AppDbContext context, IStorageService storageService)
    {
        // Assign injected unit of work
        _unitOfWork = unitOfWork;
        // Assign injected database context
        _context = context;
        // Assign injected storage service
        _storageService = storageService;
    }

    // GET /api/resources — Returns learning resources accessible to the current user
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? classId)
    {
        // Extract user ID claim from security principal
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        // Return 401 Unauthorized if user claim is missing or invalid
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            // Return 401 Unauthorized
            return Unauthorized();
        }

        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 404 Not Found if user record does not exist
        if (dbUser == null) return NotFound();

        // Base query for active non-deleted learning resources
        var query = _context.LearningResources.Where(r => !r.IsDeleted);

        // Check if a specific class workspace ID was passed in query string
        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            // Return resources belonging to target class workspace OR global university resources
            query = query.Where(r => r.ClassWorkspaceId == classId.Value || r.ClassWorkspaceId == null);
        }
        else
        {
            // Fetch list of accessible class workspace IDs for current user
            var userClassIds = await _context.ClassWorkspaces
                // Filter active classes where user is enrolled, primary lecturer, 1st/2nd Rep, or creator
                .Where(c => !c.IsDeleted && (c.Students.Any(s => s.Id == userId) || c.LecturerId == userId || c.ClassRepresentativeId == userId || c.SecondClassRepresentativeId == userId || c.CreatedByUserId == userId))
                // Select class workspace IDs
                .Select(c => c.Id)
                // Execute list query asynchronously
                .ToListAsync();

            // Return global resources OR resources belonging to any class workspace accessible to the user
            query = query.Where(r => r.ClassWorkspaceId == null || (r.ClassWorkspaceId != null && userClassIds.Contains(r.ClassWorkspaceId.Value)));
        }

        // Execute list query ordered by creation date descending
        var list = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        // Return 200 OK with list of learning resources
        return Ok(list);
    }

    // GET /api/resources/department/{departmentId} — Returns learning resources for a specific department
    [HttpGet("department/{departmentId}")]
    public async Task<IActionResult> GetByDepartment(Guid departmentId)
    {
        // Query resources by department ID asynchronously
        var resources = await _unitOfWork.LearningResources.GetByDepartmentAsync(departmentId);
        // Return 200 OK with non-deleted resources
        return Ok(resources.Where(r => !r.IsDeleted));
    }

    // GET /api/resources/{id} — Returns a learning resource by ID and increments download counter
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        // Query resource by ID using unit of work repository
        var resource = await _unitOfWork.LearningResources.GetByIdAsync(id);
        // Return 404 Not Found if resource does not exist or is soft-deleted
        if (resource == null || resource.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Resource not found" });
        }

        // Increment resource download counter
        resource.DownloadCount++;
        // Update resource entity in repository
        await _unitOfWork.LearningResources.UpdateAsync(resource);
        // Persist download counter update to database
        await _unitOfWork.SaveChangesAsync();

        // Return 200 OK with resource details
        return Ok(resource);
    }

    // POST /api/resources/upload — Handles real multipart file upload to Cloudflare R2 storage
    [HttpPost("upload")]
    // Set maximum request body size limit to 50 MB
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> Upload([FromForm] UploadResourceModel model)
    {
        // Extract user ID claim from security principal
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        // Return 401 Unauthorized if user claim is missing or invalid
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
            // Return 401 Unauthorized
            return Unauthorized();

        // Fetch current user database record
        var dbUser = await _context.Users.FindAsync(userId);
        // Return 404 Not Found if user record does not exist
        if (dbUser == null) return NotFound();

        // Enforce role-based access control (Lecturers, Reps, Administrators only)
        if (dbUser.Role != UserRole.Lecturer && dbUser.Role != UserRole.ClassRepresentative && dbUser.Role != UserRole.Administrator)
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Prevent pending or unverified lecturers from uploading resources
        if (dbUser.Role == UserRole.Lecturer && dbUser.Status != AccountStatus.Verified)
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Prevent Course Representatives from uploading global university resources
        if (dbUser.Role == UserRole.ClassRepresentative && model.IsGlobal)
        {
            // Return 403 Forbidden
            return Forbid();
        }

        // Validate that a non-empty file was provided in request
        if (model.File == null || model.File.Length == 0)
            // Return 400 Bad Request
            return BadRequest(new { Message = "No file provided." });

        // Extract file extension string
        var ext = Path.GetExtension(model.File.FileName);
        // Generate unique safe file name for storage
        var safeName = $"{Guid.NewGuid()}{ext}";
        // Target storage folder name
        var folder = "resources";

        // Declare variable to hold uploaded file public URL
        string fileUrl;
        try
        {
            // Open read stream for uploaded file
            await using var stream = model.File.OpenReadStream();
            // Upload stream to Cloudflare R2 bucket via storage service
            fileUrl = await _storageService.UploadFileAsync(safeName, stream, folder);
        }
        catch (Exception ex)
        {
            // Return 500 Internal Server Error if cloud upload fails
            return StatusCode(500, new { Message = $"R2 upload failed: {ex.Message}" });
        }

        // Resolve valid Department GUID ID to satisfy foreign key constraint
        var resolvedDeptId = await GetDepartmentIdAsync(model.DepartmentId, userId);

        // Check if resource is being uploaded globally for University Hub
        if (model.IsGlobal)
        {
            // Instantiate global LearningResource entity
            var resource = new LearningResource
            {
                // Unique GUID ID
                Id = Guid.NewGuid(),
                // Resource title
                Title = string.IsNullOrWhiteSpace(model.Title)
                    ? Path.GetFileNameWithoutExtension(model.File.FileName)
                    : model.Title,
                // Resource description text
                Description = model.Description ?? "Uploaded globally to University Hub.",
                // Cloud storage file URL
                FileUrl = fileUrl,
                // File extension type string
                FileType = ext.TrimStart('.').ToUpperInvariant(),
                // File size in bytes
                FileSize = model.File.Length,
                // Category designation
                Category = model.Category ?? "Document",
                // Search tags string
                Tags = model.Tags ?? string.Empty,
                // Department ID
                DepartmentId = resolvedDeptId,
                // Uploader user GUID ID
                UploadedByUserId = userId,
                // Initial download count zero
                DownloadCount = 0,
                // Null class workspace ID for global resources
                ClassWorkspaceId = null,
                // Creation timestamp in UTC
                CreatedAt = DateTime.UtcNow
            };

            // Add resource to database context
            await _context.LearningResources.AddAsync(resource);
            // Save database changes
            await _context.SaveChangesAsync();

            // Return 201 CreatedAtAction response
            return CreatedAtAction(nameof(GetById), new { id = resource.Id }, resource);
        }

        // Collect target class workspace IDs
        var targetClassIds = new List<Guid>();
        // Check if multiple class IDs array was provided
        if (model.ClassWorkspaceIds != null && model.ClassWorkspaceIds.Length > 0)
        {
            // Add all class IDs to target list
            targetClassIds.AddRange(model.ClassWorkspaceIds);
        }
        // Check if single class ID was provided
        else if (model.ClassWorkspaceId.HasValue)
        {
            // Add single class ID to target list
            targetClassIds.Add(model.ClassWorkspaceId.Value);
        }

        // Validate that at least one target class ID is specified for class-scoped upload
        if (targetClassIds.Count == 0)
        {
            // Return 400 Bad Request
            return BadRequest(new { Message = "At least one target class is required." });
        }

        // Variable to reference first created resource for CreatedAtAction return
        LearningResource firstResource = null!;

        // Iterate through target class IDs to create class-scoped resource records
        foreach (var classId in targetClassIds)
        {
            // Query target class workspace with enrolled students included
            var classWorkspace = await _context.ClassWorkspaces
                // Include enrolled students
                .Include(c => c.Students)
                // Find matching active class workspace
                .FirstOrDefaultAsync(c => c.Id == classId && !c.IsDeleted);
            // Skip iteration if class workspace does not exist
            if (classWorkspace == null) continue;

            // Security: Enforce class-scoped Course Representative check (verify user is 1st or 2nd Rep)
            if (dbUser.Role == UserRole.ClassRepresentative && classWorkspace.ClassRepresentativeId != userId && classWorkspace.SecondClassRepresentativeId != userId)
            {
                // Return 403 Forbidden if user is not a representative for this class workspace
                return Forbid();
            }

            // Instantiate class-scoped LearningResource entity
            var resource = new LearningResource
            {
                // Unique GUID ID
                Id = Guid.NewGuid(),
                // Resource title
                Title = string.IsNullOrWhiteSpace(model.Title)
                    ? Path.GetFileNameWithoutExtension(model.File.FileName)
                    : model.Title,
                // Description text
                Description = model.Description ?? "Uploaded via SANS resources manager.",
                // Cloud storage file URL
                FileUrl = fileUrl,
                // File extension type string
                FileType = ext.TrimStart('.').ToUpperInvariant(),
                // File size in bytes
                FileSize = model.File.Length,
                // Category designation
                Category = model.Category ?? "Document",
                // Search tags string
                Tags = model.Tags ?? string.Empty,
                // Department ID
                DepartmentId = resolvedDeptId,
                // Uploader user GUID ID
                UploadedByUserId = userId,
                // Initial download count zero
                DownloadCount = 0,
                // Associated class workspace GUID ID
                ClassWorkspaceId = classId,
                // Creation timestamp in UTC
                CreatedAt = DateTime.UtcNow
            };

            // Add resource to database context
            await _context.LearningResources.AddAsync(resource);
            // Set first created resource reference
            if (firstResource == null) firstResource = resource;

            // Trigger notification records for enrolled students in class workspace
            if (classWorkspace != null)
            {
                // Iterate through enrolled students
                foreach (var student in classWorkspace.Students)
                {
                    // Add new notification record
                    await _context.Notifications.AddAsync(new Notification
                    {
                        // Unique GUID
                        Id = Guid.NewGuid(),
                        // Notification title
                        Title = "New Resource Uploaded",
                        // Notification message text
                        Message = $"'{resource.Title}' ({resource.FileType}) has been shared in {classWorkspace.Name}.",
                        // Resource notification type
                        Type = NotificationType.Resource,
                        // Normal priority
                        Priority = NotificationPriority.Normal,
                        // Initial unread status
                        IsRead = false,
                        // Target recipient student ID
                        UserId = student.Id,
                        // Workspace context ID
                        ClassWorkspaceId = classWorkspace.Id,
                        // Creation timestamp
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        // Save all created resources and notification records to database
        await _context.SaveChangesAsync();

        // Return 201 CreatedAtAction response
        return CreatedAtAction(nameof(GetById), new { id = firstResource.Id }, new
        {
            // Resource ID
            firstResource.Id,
            // Title
            firstResource.Title,
            // Storage file URL
            firstResource.FileUrl,
            // File type string
            firstResource.FileType,
            // File size in bytes
            firstResource.FileSize,
            // Creation timestamp
            firstResource.CreatedAt
        });
    }

    // POST /api/resources — Creates a learning resource entry without cloud storage upload
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateResourceModel model)
    {
        // Extract user ID claim from security principal
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        // Return 401 Unauthorized if user claim is missing or invalid
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out Guid userId))
        {
            // Return 401 Unauthorized
            return Unauthorized();
        }

        // Resolve valid Department GUID ID
        var resolvedDeptId = await GetDepartmentIdAsync(model.DepartmentId, userId);

        // Collect target class workspace IDs
        var targetClassIds = new List<Guid>();
        // Check if multiple class IDs array was provided
        if (model.ClassWorkspaceIds != null && model.ClassWorkspaceIds.Length > 0)
        {
            // Add all class IDs to target list
            targetClassIds.AddRange(model.ClassWorkspaceIds);
        }
        // Check if single class ID was provided
        else if (model.ClassWorkspaceId.HasValue)
        {
            // Add single class ID to target list
            targetClassIds.Add(model.ClassWorkspaceId.Value);
        }

        // Validate that at least one target class ID is specified
        if (targetClassIds.Count == 0)
        {
            // Return 400 Bad Request
            return BadRequest(new { Message = "At least one target class is required." });
        }

        // Variable to reference first created resource
        LearningResource firstResource = null!;

        // Iterate through target class IDs to create resource records
        foreach (var classId in targetClassIds)
        {
            // Instantiate new LearningResource entity
            var resource = new LearningResource
            {
                // Unique GUID ID
                Id = Guid.NewGuid(),
                // Resource title
                Title = model.Title,
                // Description text
                Description = model.Description,
                // File URL string
                FileUrl = model.FileUrl,
                // File type string
                FileType = model.FileType,
                // File size in bytes
                FileSize = model.FileSize,
                // Category designation
                Category = model.Category,
                // Search tags string
                Tags = model.Tags,
                // Department ID
                DepartmentId = resolvedDeptId,
                // Uploader user GUID ID
                UploadedByUserId = userId,
                // Initial download count zero
                DownloadCount = 0,
                // Class workspace GUID ID
                ClassWorkspaceId = classId,
                // Creation timestamp in UTC
                CreatedAt = DateTime.UtcNow
            };

            // Add resource to database context
            await _context.LearningResources.AddAsync(resource);
            // Set first created resource reference
            if (firstResource == null) firstResource = resource;

            // Query class workspace with enrolled students included
            var classWorkspace = await _context.ClassWorkspaces
                // Include enrolled students
                .Include(c => c.Students)
                // Find matching active class workspace
                .FirstOrDefaultAsync(c => c.Id == classId && !c.IsDeleted);

            // Trigger notification records for enrolled students
            if (classWorkspace != null)
            {
                // Iterate through enrolled students
                foreach (var student in classWorkspace.Students)
                {
                    // Add new notification record
                    await _context.Notifications.AddAsync(new Notification
                    {
                        // Unique GUID
                        Id = Guid.NewGuid(),
                        // Title
                        Title = "New Resource Uploaded",
                        // Message text
                        Message = $"A new resource file '{model.Title}' ({model.FileType}) has been shared in {classWorkspace.Name}.",
                        // Notification type
                        Type = NotificationType.Resource,
                        // Normal priority
                        Priority = NotificationPriority.Normal,
                        // Initial unread status
                        IsRead = false,
                        // Target recipient student ID
                        UserId = student.Id,
                        // Workspace context ID
                        ClassWorkspaceId = classWorkspace.Id,
                        // Creation timestamp
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        // Save resources and notifications to database
        await _context.SaveChangesAsync();

        // Return 201 CreatedAtAction response
        return CreatedAtAction(nameof(GetById), new { id = firstResource.Id }, firstResource);
    }

    // PUT /api/resources/{id} — Updates learning resource metadata
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateResourceModel model)
    {
        // Query target resource by ID using unit of work repository
        var resource = await _unitOfWork.LearningResources.GetByIdAsync(id);
        // Return 404 Not Found if resource does not exist or is soft-deleted
        if (resource == null || resource.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Resource not found" });
        }

        // Update title property
        resource.Title = model.Title;
        // Update description property
        resource.Description = model.Description;
        // Update category property
        resource.Category = model.Category;
        // Update tags property
        resource.Tags = model.Tags;
        // Update modification timestamp
        resource.UpdatedAt = DateTime.UtcNow;

        // Update resource in repository
        await _unitOfWork.LearningResources.UpdateAsync(resource);
        // Save database changes
        await _unitOfWork.SaveChangesAsync();

        // Return 200 OK with updated resource
        return Ok(resource);
    }

    // DELETE /api/resources/{id} — Soft-deletes a learning resource
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        // Query target resource by ID using repository
        var resource = await _unitOfWork.LearningResources.GetByIdAsync(id);
        // Return 404 Not Found if resource does not exist or is soft-deleted
        if (resource == null || resource.IsDeleted)
        {
            // Return 404 Not Found
            return NotFound(new { Message = "Resource not found" });
        }

        // Set soft-deletion flag to true
        resource.IsDeleted = true;
        // Set deletion timestamp to UTC now
        resource.DeletedAt = DateTime.UtcNow;

        // Update resource entity in repository
        await _unitOfWork.LearningResources.UpdateAsync(resource);
        // Save database changes
        await _unitOfWork.SaveChangesAsync();

        // Return 200 OK success message
        return Ok(new { Message = "Resource deleted successfully" });
    }

    // Private helper method to resolve a valid Department GUID ID
    private async Task<Guid> GetDepartmentIdAsync(Guid? modelDeptId, Guid userId)
    {
        // Check if a valid model department ID was provided
        if (modelDeptId.HasValue && modelDeptId.Value != Guid.Empty)
        {
            // Return model department ID
            return modelDeptId.Value;
        }

        // Query user record to check user's assigned department ID
        var dbUser = await _context.Users.FindAsync(userId);
        // Check if user has assigned department ID
        if (dbUser?.DepartmentId.HasValue == true && dbUser.DepartmentId.Value != Guid.Empty)
        {
            // Return user's department ID
            return dbUser.DepartmentId.Value;
        }

        // Fallback: Query first active department from database
        var firstDept = await _context.Departments.FirstOrDefaultAsync();
        // Check if a department record exists
        if (firstDept != null)
        {
            // Return first department ID
            return firstDept.Id;
        }

        // Ultimate fallback GUID ID for database foreign key satisfaction
        return Guid.Parse("11111111-1111-1111-1111-111111111111");
    }
}

// Request Models for Learning Resource Operations

// Model for creating learning resource entries
public class CreateResourceModel
{
    // Resource title property
    public string Title { get; set; } = string.Empty;
    // Resource description text property
    public string Description { get; set; } = string.Empty;
    // File storage URL property
    public string FileUrl { get; set; } = string.Empty;
    // File type extension string property
    public string FileType { get; set; } = string.Empty;
    // File size in bytes property
    public long FileSize { get; set; }
    // Resource category property
    public string Category { get; set; } = string.Empty;
    // Search tags string property
    public string Tags { get; set; } = string.Empty;
    // Department GUID ID property
    public Guid DepartmentId { get; set; }
    // Single class workspace GUID ID property
    public Guid? ClassWorkspaceId { get; set; }
    // Array of target class workspace GUID IDs property
    public Guid[]? ClassWorkspaceIds { get; set; }
}

// Model for updating learning resource metadata
public class UpdateResourceModel
{
    // Resource title property
    public string Title { get; set; } = string.Empty;
    // Resource description text property
    public string Description { get; set; } = string.Empty;
    // Resource category property
    public string Category { get; set; } = string.Empty;
    // Search tags string property
    public string Tags { get; set; } = string.Empty;
}

// Model for real multipart file upload to Cloudflare R2 storage
public class UploadResourceModel
{
    // Uploaded file binary object from multipart request
    public IFormFile? File { get; set; }
    // Resource title property
    public string? Title { get; set; }
    // Resource description text property
    public string? Description { get; set; }
    // Resource category property
    public string? Category { get; set; }
    // Search tags string property
    public string? Tags { get; set; }
    // Department GUID ID property
    public Guid? DepartmentId { get; set; }
    // Single class workspace GUID ID property
    public Guid? ClassWorkspaceId { get; set; }
    // Array of target class workspace GUID IDs property
    public Guid[]? ClassWorkspaceIds { get; set; }
    // Boolean flag indicating global university scope
    public bool IsGlobal { get; set; }
}
