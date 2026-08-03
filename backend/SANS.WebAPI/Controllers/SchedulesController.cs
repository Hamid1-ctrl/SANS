using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SANS.Application.Interfaces;
using SANS.Application.Interfaces.Services;
using SANS.Domain.Entities;
using SANS.Domain.Enums;
using SANS.Infrastructure.Data;

namespace SANS.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SchedulesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IStorageService _storageService;

    public SchedulesController(AppDbContext context, IStorageService storageService)
    {
        _context = context;
        _storageService = storageService;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }

    // Helper to get all workspace IDs linked to the current user
    private async Task<List<Guid>> GetUserClassWorkspaceIdsAsync(Guid userId)
    {
        var ids = await _context.ClassWorkspaces
            .Where(c => !c.IsDeleted && (
                c.Students.Any(st => st.Id == userId) ||
                // User is assigned as 1st Course Representative for class workspace
                c.ClassRepresentativeId == userId ||
                // User is assigned as 2nd Course Representative for class workspace
                c.SecondClassRepresentativeId == userId ||
                c.LecturerId == userId ||
                c.CreatedByUserId == userId
            ))
            .Select(c => c.Id)
            .ToListAsync();

        if (ids.Count == 0)
        {
            ids = await _context.ClassWorkspaces
                .Where(c => !c.IsDeleted)
                .Select(c => c.Id)
                .ToListAsync();
        }

        return ids;
    }

    // ─── 1. Get Class Timetables ─────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? classId,
        [FromQuery] string? course,
        [FromQuery] int? day,
        [FromQuery] string? lecturer,
        [FromQuery] string? venue,
        [FromQuery] string? lectureType)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        var query = _context.Schedules.Where(s => !s.IsDeleted && !s.IsMaster);

        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            query = query.Where(s => s.ClassWorkspaceId == classId.Value || s.ClassWorkspaceId == null);
        }
        else
        {
            var userClassIds = await GetUserClassWorkspaceIdsAsync(userId);
            if (userClassIds.Count > 0)
            {
                query = query.Where(s => (s.ClassWorkspaceId.HasValue && userClassIds.Contains(s.ClassWorkspaceId.Value)) || s.ClassWorkspaceId == null);
            }
        }

        // Apply filters
        if (!string.IsNullOrWhiteSpace(course))
        {
            var term = course.Trim().ToLower();
            query = query.Where(s => s.CourseCode.ToLower().Contains(term) || s.CourseTitle.ToLower().Contains(term) || s.Title.ToLower().Contains(term));
        }

        if (day.HasValue && day.Value >= 1 && day.Value <= 7)
        {
            query = query.Where(s => s.DayOfWeek == day.Value);
        }

        if (!string.IsNullOrWhiteSpace(lecturer))
        {
            var term = lecturer.Trim().ToLower();
            query = query.Where(s => s.LecturerName.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(venue))
        {
            var term = venue.Trim().ToLower();
            query = query.Where(s => s.Room.ToLower().Contains(term) || s.Building.ToLower().Contains(term) || s.Location.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(lectureType) && lectureType != "All")
        {
            query = query.Where(s => s.LectureType.ToLower() == lectureType.Trim().ToLower());
        }

        var list = await query.OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime).ToListAsync();
        return Ok(list);
    }

    // ─── 2. Master University Timetable Reference Entries & Uploaded Docs ─────
    [HttpGet("master")]
    public async Task<IActionResult> GetMasterTimetable()
    {
        var masterList = await _context.Schedules
            .Where(s => !s.IsDeleted && s.IsMaster)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        if (masterList.Count == 0)
        {
            // Seed fallback reference slots
            var now = DateTime.UtcNow;
            masterList = new List<Schedule>
            {
                new Schedule
                {
                    Id = Guid.NewGuid(),
                    CourseCode = "CE300",
                    CourseTitle = "Database Systems",
                    Title = "Database Systems Master Slot",
                    DayOfWeek = 1, // Monday
                    StartTime = new DateTime(now.Year, now.Month, 1, 9, 0, 0, DateTimeKind.Utc),
                    EndTime = new DateTime(now.Year, now.Month, 1, 11, 0, 0, DateTimeKind.Utc),
                    Building = "Engineering Block",
                    Room = "SR2",
                    Location = "Engineering Block - SR2",
                    LectureType = "Lecture",
                    LecturerName = "Dr. Mensah",
                    AcademicLevel = "Level 300",
                    Semester = "Semester 1",
                    IsMaster = true,
                    IsPublished = true
                },
                new Schedule
                {
                    Id = Guid.NewGuid(),
                    CourseCode = "CE300",
                    CourseTitle = "Software Engineering",
                    Title = "Software Engineering Master Slot",
                    DayOfWeek = 1, // Monday
                    StartTime = new DateTime(now.Year, now.Month, 1, 10, 30, 0, DateTimeKind.Utc),
                    EndTime = new DateTime(now.Year, now.Month, 1, 12, 30, 0, DateTimeKind.Utc),
                    Building = "Engineering Block",
                    Room = "SR1",
                    Location = "Engineering Block - SR1",
                    LectureType = "Lecture",
                    LecturerName = "Dr. Asante",
                    AcademicLevel = "Level 300",
                    Semester = "Semester 1",
                    IsMaster = true,
                    IsPublished = true
                },
                new Schedule
                {
                    Id = Guid.NewGuid(),
                    CourseCode = "CE300",
                    CourseTitle = "Software Architecture",
                    Title = "Software Architecture Master Slot",
                    DayOfWeek = 2, // Tuesday
                    StartTime = new DateTime(now.Year, now.Month, 1, 14, 0, 0, DateTimeKind.Utc),
                    EndTime = new DateTime(now.Year, now.Month, 1, 15, 30, 0, DateTimeKind.Utc),
                    Building = "Science Complex",
                    Room = "Lecture Hall C",
                    Location = "Science Complex - Lecture Hall C",
                    LectureType = "Tutorial",
                    LecturerName = "Dr. Jenkins",
                    AcademicLevel = "Level 300",
                    Semester = "Semester 1",
                    IsMaster = true,
                    IsPublished = true
                }
            };
        }

        return Ok(masterList);
    }

    // ─── 3. Upload Master Timetable Document File ─────────────────────────────
    [HttpPost("master/upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadMasterTimetable([FromForm] UploadMasterTimetableForm form)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        if (form.File == null || form.File.Length == 0)
        {
            return BadRequest(new { Message = "No file provided for master timetable upload." });
        }

        using var stream = form.File.OpenReadStream();
        string fileUrl = await _storageService.UploadFileAsync(form.File.FileName, stream, "master-timetables");

        string fileExt = Path.GetExtension(form.File.FileName).TrimStart('.').ToLower();

        var schedule = new Schedule
        {
            Id = Guid.NewGuid(),
            Title = string.IsNullOrWhiteSpace(form.Title) ? $"Official Master Timetable - {form.File.FileName}" : form.Title.Trim(),
            Description = form.Description ?? "Official University Master Timetable Document",
            CourseCode = string.IsNullOrWhiteSpace(form.CourseCode) ? "ALL" : form.CourseCode.Trim().ToUpper(),
            CourseTitle = "University Master Timetable",
            DayOfWeek = 1,
            StartTime = DateTime.UtcNow,
            EndTime = DateTime.UtcNow.AddMonths(4),
            Building = "Main Campus",
            Room = "Notice Board",
            Location = "Main Campus - Academic Affairs",
            LectureType = "Master Document",
            LecturerName = $"{dbUser.FirstName} {dbUser.LastName}",
            Notes = "Official Published University Master Schedule",
            IsMaster = true,
            IsPublished = true,
            FileUrl = fileUrl,
            FileName = form.File.FileName,
            FileType = fileExt,
            FileSize = form.File.Length,
            CreatedAt = DateTime.UtcNow
        };

        _context.Schedules.Add(schedule);
        await _context.SaveChangesAsync();

        return Ok(schedule);
    }

    // ─── 4. Today's Class Summary & Next Class Widget ───────────────────────
    [HttpGet("today-summary")]
    public async Task<IActionResult> GetTodaySummary([FromQuery] Guid? classId)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        var today = DateTime.UtcNow;
        int currentDayOfWeek = (int)today.DayOfWeek;
        if (currentDayOfWeek == 0) currentDayOfWeek = 7;

        var query = _context.Schedules.Where(s => !s.IsDeleted && !s.IsMaster);

        if (classId.HasValue && classId.Value != Guid.Empty)
        {
            query = query.Where(s => s.ClassWorkspaceId == classId.Value || s.ClassWorkspaceId == null);
        }
        else
        {
            var userClassIds = await GetUserClassWorkspaceIdsAsync(userId);
            if (userClassIds.Count > 0)
            {
                query = query.Where(s => (s.ClassWorkspaceId.HasValue && userClassIds.Contains(s.ClassWorkspaceId.Value)) || s.ClassWorkspaceId == null);
            }
        }

        var allClassSchedules = await query.ToListAsync();

        if (allClassSchedules.Count == 0)
        {
            // Fallback: Return all non-deleted, non-master schedules if workspace filter returned empty
            allClassSchedules = await _context.Schedules
                .Where(s => !s.IsDeleted && !s.IsMaster)
                .ToListAsync();
        }

        var todayClasses = allClassSchedules
            .Where(s => s.DayOfWeek == currentDayOfWeek || (s.StartTime.Date == today.Date))
            .OrderBy(s => s.StartTime.TimeOfDay)
            .ToList();

        Schedule? nextClass = null;
        string startsIn = string.Empty;

        var nowTime = today.TimeOfDay;
        var upcomingToday = todayClasses.FirstOrDefault(s => s.StartTime.TimeOfDay > nowTime);

        if (upcomingToday != null)
        {
            nextClass = upcomingToday;
            var diff = upcomingToday.StartTime.TimeOfDay - nowTime;
            if (diff.TotalHours >= 1)
            {
                int hrs = (int)diff.TotalHours;
                int mins = diff.Minutes;
                startsIn = mins > 0 ? $"Starts in {hrs} hr {mins} mins" : $"Starts in {hrs} hr";
            }
            else
            {
                int mins = Math.Max(1, (int)diff.TotalMinutes);
                startsIn = $"Starts in {mins} mins";
            }
        }
        else if (todayClasses.Count > 0)
        {
            nextClass = todayClasses.First();
            var startTimeStr = nextClass.StartTime.ToString("hh:mm tt");
            startsIn = $"Today at {startTimeStr}";
        }
        else
        {
            // Search upcoming days in week if no classes scheduled for today
            for (int offset = 1; offset <= 7; offset++)
            {
                int targetDay = ((currentDayOfWeek - 1 + offset) % 7) + 1;
                var upcomingDayClasses = allClassSchedules
                    .Where(s => s.DayOfWeek == targetDay)
                    .OrderBy(s => s.StartTime.TimeOfDay)
                    .ToList();

                if (upcomingDayClasses.Count > 0)
                {
                    nextClass = upcomingDayClasses.First();
                    string dayName = targetDay switch
                    {
                        1 => "Monday",
                        2 => "Tuesday",
                        3 => "Wednesday",
                        4 => "Thursday",
                        5 => "Friday",
                        6 => "Saturday",
                        7 => "Sunday",
                        _ => "Upcoming"
                    };
                    var startTimeStr = nextClass.StartTime.ToString("hh:mm tt");
                    startsIn = $"{dayName} at {startTimeStr}";
                    break;
                }
            }
        }

        var reminders = new List<string>();
        if (todayClasses.Count > 0)
        {
            reminders.Add($"You have {todayClasses.Count} scheduled class{(todayClasses.Count > 1 ? "es" : "")} today.");
            foreach (var cls in todayClasses.Take(2))
            {
                var startTimeStr = cls.StartTime.ToString("hh:mm tt");
                var roomStr = string.IsNullOrWhiteSpace(cls.Room) ? cls.Location : cls.Room;
                reminders.Add($"{cls.CourseCode.Trim()} {cls.Title} starts at {startTimeStr} in {roomStr}.");
            }
        }
        else if (nextClass != null)
        {
            reminders.Add($"Your next lecture ({nextClass.CourseCode}) is scheduled for {startsIn}.");
        }
        else
        {
            reminders.Add("You have no scheduled classes today.");
        }

        return Ok(new
        {
            UserName = $"{dbUser.FirstName} {dbUser.LastName}",
            TodayDate = today.ToString("dddd, MMMM d, yyyy"),
            DayOfWeek = currentDayOfWeek,
            TodayClassesCount = todayClasses.Count,
            TodayClasses = todayClasses,
            NextClass = nextClass,
            StartsIn = startsIn,
            Reminders = reminders
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var schedule = await _context.Schedules.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (schedule == null)
        {
            return NotFound(new { Message = "Schedule not found" });
        }
        return Ok(schedule);
    }

    // ─── 5. Create & Publish Class Timetable Slot ────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateScheduleModel model)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        Guid? targetWorkspaceId = null;

        if (model.ClassWorkspaceId.HasValue && model.ClassWorkspaceId.Value != Guid.Empty)
        {
            targetWorkspaceId = model.ClassWorkspaceId.Value;
        }
        else
        {
            var userWorkspaceIds = await GetUserClassWorkspaceIdsAsync(userId);
            if (userWorkspaceIds.Count > 0)
            {
                targetWorkspaceId = userWorkspaceIds.First();
            }
            else
            {
                var firstWorkspace = await _context.ClassWorkspaces.FirstOrDefaultAsync(c => !c.IsDeleted);
                if (firstWorkspace != null)
                {
                    targetWorkspaceId = firstWorkspace.Id;
                }
            }
        }

        string roomStr = string.IsNullOrWhiteSpace(model.Room) ? "SR1" : model.Room.Trim();
        string buildingStr = string.IsNullOrWhiteSpace(model.Building) ? "Engineering Block" : model.Building.Trim();
        string locationCombined = $"{buildingStr} - {roomStr}";

        var schedule = new Schedule
        {
            Id = Guid.NewGuid(),
            Title = string.IsNullOrWhiteSpace(model.Title) ? $"{model.CourseCode} {model.LectureType}" : model.Title,
            Description = model.Description ?? string.Empty,
            CourseCode = string.IsNullOrWhiteSpace(model.CourseCode) ? "CE300" : model.CourseCode.Trim().ToUpper(),
            CourseTitle = string.IsNullOrWhiteSpace(model.CourseTitle) ? model.Title : model.CourseTitle.Trim(),
            DayOfWeek = model.DayOfWeek > 0 ? model.DayOfWeek : (int)model.StartTime.DayOfWeek,
            StartTime = model.StartTime,
            EndTime = model.EndTime > model.StartTime ? model.EndTime : model.StartTime.AddHours(2),
            Building = buildingStr,
            Room = roomStr,
            Location = locationCombined,
            LectureType = string.IsNullOrWhiteSpace(model.LectureType) ? "Lecture" : model.LectureType,
            LecturerName = string.IsNullOrWhiteSpace(model.LecturerName) ? $"{dbUser.FirstName} {dbUser.LastName}" : model.LecturerName,
            Notes = model.Notes ?? string.Empty,
            IsMaster = false,
            IsPublished = true,
            AcademicLevel = string.IsNullOrWhiteSpace(model.AcademicLevel) ? "Level 300" : model.AcademicLevel,
            Semester = string.IsNullOrWhiteSpace(model.Semester) ? "Semester 1" : model.Semester,
            IsRecurring = model.IsRecurring,
            RecurrencePattern = model.RecurrencePattern ?? "Weekly",
            ClassWorkspaceId = targetWorkspaceId,
            DepartmentId = dbUser.DepartmentId,
            InstructorId = model.InstructorId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Schedules.Add(schedule);

        if (targetWorkspaceId.HasValue)
        {
            var classWorkspace = await _context.ClassWorkspaces
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == targetWorkspaceId.Value && !c.IsDeleted);

            if (classWorkspace != null)
            {
                foreach (var student in classWorkspace.Students)
                {
                    if (student.Id == userId) continue;
                    _context.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        Title = "New Timetable Published",
                        Message = $"Class timetable updated for {classWorkspace.Name}: {schedule.CourseCode} ({schedule.LectureType}) at {roomStr}.",
                        Type = NotificationType.Alert,
                        Priority = NotificationPriority.High,
                        IsRead = false,
                        UserId = student.Id,
                        ClassWorkspaceId = classWorkspace.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        try
        {
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = schedule.Id }, schedule);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "Failed to save schedule.", Error = ex.InnerException?.Message ?? ex.Message });
        }
    }

    // ─── 6. Import Master Timetable Entry to Class Timetable ─────────────────
    [HttpPost("import-master")]
    public async Task<IActionResult> ImportMasterEntry([FromBody] ImportMasterModel model)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dbUser = await _context.Users.FindAsync(userId);
        if (dbUser == null) return NotFound();

        var masterEntry = await _context.Schedules.FirstOrDefaultAsync(s => s.Id == model.MasterScheduleId && s.IsMaster && !s.IsDeleted);
        if (masterEntry == null)
        {
            return NotFound(new { Message = "Master timetable entry not found." });
        }

        Guid? workspaceId = model.ClassWorkspaceId != Guid.Empty ? model.ClassWorkspaceId : null;
        if (!workspaceId.HasValue)
        {
            var userWorkspaceIds = await GetUserClassWorkspaceIdsAsync(userId);
            if (userWorkspaceIds.Count > 0) workspaceId = userWorkspaceIds.First();
        }

        var newSchedule = new Schedule
        {
            Id = Guid.NewGuid(),
            Title = masterEntry.Title,
            Description = masterEntry.Description,
            CourseCode = masterEntry.CourseCode,
            CourseTitle = masterEntry.CourseTitle,
            DayOfWeek = masterEntry.DayOfWeek,
            StartTime = masterEntry.StartTime,
            EndTime = masterEntry.EndTime,
            Building = masterEntry.Building,
            Room = masterEntry.Room,
            Location = masterEntry.Location,
            LectureType = masterEntry.LectureType,
            LecturerName = masterEntry.LecturerName,
            Notes = masterEntry.Notes,
            AcademicLevel = masterEntry.AcademicLevel,
            Semester = masterEntry.Semester,
            IsMaster = false,
            IsPublished = true,
            IsRecurring = true,
            RecurrencePattern = "Weekly",
            ClassWorkspaceId = workspaceId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Schedules.Add(newSchedule);

        if (workspaceId.HasValue)
        {
            var classWorkspace = await _context.ClassWorkspaces
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == workspaceId.Value && !c.IsDeleted);

            if (classWorkspace != null)
            {
                foreach (var student in classWorkspace.Students)
                {
                    _context.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        Title = "Class Timetable Updated",
                        Message = $"Added {masterEntry.CourseCode} ({masterEntry.LectureType}) to class timetable.",
                        Type = NotificationType.Alert,
                        Priority = NotificationPriority.Normal,
                        UserId = student.Id,
                        ClassWorkspaceId = classWorkspace.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        await _context.SaveChangesAsync();
        return Ok(newSchedule);
    }

    // ─── 7. Update Timetable Entry ──────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateScheduleModel model)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var schedule = await _context.Schedules.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (schedule == null) return NotFound(new { Message = "Schedule not found" });

        schedule.Title = model.Title;
        schedule.Description = model.Description ?? string.Empty;
        schedule.CourseCode = string.IsNullOrWhiteSpace(model.CourseCode) ? schedule.CourseCode : model.CourseCode;
        schedule.CourseTitle = string.IsNullOrWhiteSpace(model.CourseTitle) ? schedule.CourseTitle : model.CourseTitle;
        schedule.DayOfWeek = model.DayOfWeek > 0 ? model.DayOfWeek : schedule.DayOfWeek;
        schedule.StartTime = model.StartTime;
        schedule.EndTime = model.EndTime;
        schedule.Building = model.Building ?? schedule.Building;
        schedule.Room = model.Room ?? schedule.Room;
        schedule.Location = $"{schedule.Building} - {schedule.Room}";
        schedule.LectureType = model.LectureType ?? schedule.LectureType;
        schedule.LecturerName = model.LecturerName ?? schedule.LecturerName;
        schedule.Notes = model.Notes ?? schedule.Notes;
        schedule.IsRecurring = model.IsRecurring;
        schedule.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(schedule);
    }

    // ─── 8. Delete Timetable Entry ──────────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var schedule = await _context.Schedules.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (schedule == null) return NotFound(new { Message = "Schedule not found" });

        schedule.IsDeleted = true;
        schedule.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Schedule deleted successfully" });
    }
}

public class UploadMasterTimetableForm
{
    public string? CourseCode { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public IFormFile File { get; set; } = null!;
}

public class CreateScheduleModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CourseCode { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public int DayOfWeek { get; set; } = 1;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Building { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string LectureType { get; set; } = "Lecture";
    public string LecturerName { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string AcademicLevel { get; set; } = "Level 300";
    public string Semester { get; set; } = "Semester 1";
    public bool IsRecurring { get; set; } = true;
    public string? RecurrencePattern { get; set; } = "Weekly";
    public Guid? InstructorId { get; set; }
    public Guid? ClassWorkspaceId { get; set; }
}

public class UpdateScheduleModel
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CourseCode { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public int DayOfWeek { get; set; } = 1;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Building { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public string LectureType { get; set; } = "Lecture";
    public string LecturerName { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public bool IsRecurring { get; set; } = true;
    public string? RecurrencePattern { get; set; } = "Weekly";
    public Guid? InstructorId { get; set; }
}

public class ImportMasterModel
{
    public Guid MasterScheduleId { get; set; }
    public Guid ClassWorkspaceId { get; set; }
}
