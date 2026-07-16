using Microsoft.EntityFrameworkCore;
using SANS.Domain.Entities;
using SANS.Domain.Enums;

namespace SANS.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Department> Departments { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<Announcement> Announcements { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<Assignment> Assignments { get; set; }
    public DbSet<AssignmentSubmission> AssignmentSubmissions { get; set; }
    public DbSet<LearningResource> LearningResources { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<Channel> Channels { get; set; }
    public DbSet<ChannelMember> ChannelMembers { get; set; }
    public DbSet<Schedule> Schedules { get; set; }
    public DbSet<Exam> Exams { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<ClassWorkspace> ClassWorkspaces { get; set; }
    public DbSet<Bookmark> Bookmarks { get; set; }
    public DbSet<AnnouncementEngagement> AnnouncementEngagements { get; set; }
    public DbSet<Quiz> Quizzes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.StudentId).IsUnique();
            entity.HasIndex(e => e.FirebaseUid).IsUnique();
            entity.Property(e => e.FirebaseUid).HasMaxLength(128);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.StudentId).HasMaxLength(50);
            entity.Property(e => e.OfficeNumber).HasMaxLength(50);
            entity.Property(e => e.OfficeHours).HasMaxLength(100);
            entity.Property(e => e.Specialization).HasMaxLength(200);
            
            entity.HasOne(e => e.Department)
                .WithMany(d => d.Users)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Department configuration
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Description).HasMaxLength(1000);
        });

        // RefreshToken configuration
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.Property(e => e.Token).IsRequired();
            
            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Announcement configuration
        modelBuilder.Entity<Announcement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Content).IsRequired();
            
            entity.HasOne(e => e.Department)
                .WithMany(d => d.Announcements)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Notification configuration
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Message).IsRequired();
            
            entity.HasOne(e => e.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Announcement)
                .WithMany(a => a.Notifications)
                .HasForeignKey(e => e.AnnouncementId)
                .OnDelete(DeleteBehavior.SetNull);
                
            entity.HasOne(e => e.Assignment)
                .WithMany(a => a.Notifications)
                .HasForeignKey(e => e.AssignmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Assignment configuration
        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).IsRequired();
            entity.Property(e => e.MaxPoints).IsRequired();
            
            entity.HasOne(e => e.Department)
                .WithMany(d => d.Assignments)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
                
            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // AssignmentSubmission configuration
        modelBuilder.Entity<AssignmentSubmission>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasOne(e => e.Assignment)
                .WithMany(a => a.Submissions)
                .HasForeignKey(e => e.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Student)
                .WithMany(u => u.AssignmentSubmissions)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.GradedByUser)
                .WithMany()
                .HasForeignKey(e => e.GradedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // LearningResource configuration
        modelBuilder.Entity<LearningResource>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.FileUrl).IsRequired();
            entity.Property(e => e.FileType).IsRequired().HasMaxLength(50);
            
            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
                
            entity.HasOne(e => e.UploadedByUser)
                .WithMany()
                .HasForeignKey(e => e.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Message configuration
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired();
            
            entity.HasOne(e => e.Sender)
                .WithMany(u => u.SentMessages)
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
                
            entity.HasOne(e => e.Receiver)
                .WithMany(u => u.ReceivedMessages)
                .HasForeignKey(e => e.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);
                
            entity.HasOne(e => e.Channel)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ChannelId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Channel configuration
        modelBuilder.Entity<Channel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            
            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
                
            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ChannelMember configuration
        modelBuilder.Entity<ChannelMember>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasOne(e => e.Channel)
                .WithMany(c => c.Members)
                .HasForeignKey(e => e.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Schedule configuration
        modelBuilder.Entity<Schedule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Location).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Room).IsRequired().HasMaxLength(50);
            
            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
                
            entity.HasOne(e => e.Instructor)
                .WithMany()
                .HasForeignKey(e => e.InstructorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Exam configuration
        modelBuilder.Entity<Exam>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Location).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Room).IsRequired().HasMaxLength(50);
            entity.Property(e => e.MaxPoints).IsRequired();
            
            entity.HasOne(e => e.Department)
                .WithMany(d => d.Exams)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
                
            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // AuditLog configuration
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EntityName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.IpAddress).IsRequired().HasMaxLength(50);
            
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ClassWorkspace configuration
        modelBuilder.Entity<ClassWorkspace>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.Code).IsUnique();

            entity.HasOne(e => e.Lecturer)
                .WithMany()
                .HasForeignKey(e => e.LecturerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Students)
                .WithMany(u => u.EnrolledClasses)
                .UsingEntity(j => j.ToTable("ClassEnrollments"));
        });

        // Bookmark configuration
        modelBuilder.Entity<Bookmark>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AnnouncementEngagement configuration
        modelBuilder.Entity<AnnouncementEngagement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActionType).IsRequired().HasMaxLength(50);
            
            entity.HasOne(e => e.Announcement)
                .WithMany(a => a.Engagements)
                .HasForeignKey(e => e.AnnouncementId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Modify existing entity relations to include ClassWorkspace nullable foreign key
        modelBuilder.Entity<Announcement>()
            .HasOne(e => e.ClassWorkspace)
            .WithMany(c => c.Announcements)
            .HasForeignKey(e => e.ClassWorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Assignment>()
            .HasOne(e => e.ClassWorkspace)
            .WithMany(c => c.Assignments)
            .HasForeignKey(e => e.ClassWorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LearningResource>()
            .HasOne(e => e.ClassWorkspace)
            .WithMany(c => c.LearningResources)
            .HasForeignKey(e => e.ClassWorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Schedule>()
            .HasOne(e => e.ClassWorkspace)
            .WithMany(c => c.Schedules)
            .HasForeignKey(e => e.ClassWorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Channel>()
            .HasOne(e => e.ClassWorkspace)
            .WithMany(c => c.Channels)
            .HasForeignKey(e => e.ClassWorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Notification>()
            .HasOne(e => e.ClassWorkspace)
            .WithMany()
            .HasForeignKey(e => e.ClassWorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Quiz>()
            .HasOne(e => e.ClassWorkspace)
            .WithMany(c => c.Quizzes)
            .HasForeignKey(e => e.ClassWorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Message>()
            .HasOne(e => e.ClassWorkspace)
            .WithMany()
            .HasForeignKey(e => e.ClassWorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Seed initial Department
        var departmentId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        modelBuilder.Entity<Department>().HasData(new Department
        {
            Id = departmentId,
            Name = "Computer Science & Software Engineering",
            Code = "CSSE",
            Description = "Core computing department",
            IsActive = true,
            CreatedAt = new DateTime(2026, 7, 4, 0, 0, 0, DateTimeKind.Utc),
            IsDeleted = false
        });

        // Seed initial Users (password is "password")
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Email = "student.sans@sans.edu",
                PasswordHash = "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=",
                FirstName = "Student",
                LastName = "User",
                StudentId = "SANS-STU-2026",
                PhoneNumber = "+15551234567",
                Role = UserRole.Student,
                DepartmentId = departmentId,
                IsActive = true,
                CreatedAt = new DateTime(2026, 7, 4, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "System",
                IsDeleted = false
            },
            new User
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Email = "lecturer.sans@sans.edu",
                PasswordHash = "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=",
                FirstName = "Lecturer",
                LastName = "User",
                StudentId = "SANS-LEC-2026",
                PhoneNumber = "+15559876543",
                Role = UserRole.Lecturer,
                DepartmentId = departmentId,
                IsActive = true,
                CreatedAt = new DateTime(2026, 7, 4, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "System",
                IsDeleted = false
            },
            new User
            {
                Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                Email = "rep.sans@sans.edu",
                PasswordHash = "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=",
                FirstName = "Rep",
                LastName = "User",
                StudentId = "SANS-REP-2026",
                PhoneNumber = "+15554321098",
                Role = UserRole.ClassRepresentative,
                DepartmentId = departmentId,
                IsActive = true,
                CreatedAt = new DateTime(2026, 7, 4, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "System",
                IsDeleted = false
            }
        );
    }
}
