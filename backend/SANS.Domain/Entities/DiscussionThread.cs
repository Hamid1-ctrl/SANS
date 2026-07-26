using System;
using System.Collections.Generic;

namespace SANS.Domain.Entities;

public class DiscussionThread
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClassWorkspaceId { get; set; }
    public ClassWorkspace? ClassWorkspace { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; // General, Assignment, Quiz, Lecture, Meeting, Announcement Follow-up, Question, Academic Help, Other

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public bool IsPinned { get; set; } = false;
    public bool IsLocked { get; set; } = false;
    public int RepliesCount { get; set; } = 0;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;

    public ICollection<DiscussionReply> Replies { get; set; } = new List<DiscussionReply>();
    public ICollection<DiscussionAttachment> Attachments { get; set; } = new List<DiscussionAttachment>();
}
