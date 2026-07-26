using System;
using System.Collections.Generic;

namespace SANS.Domain.Entities;

public class DiscussionReply
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid DiscussionThreadId { get; set; }
    public DiscussionThread? DiscussionThread { get; set; }

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public string Content { get; set; } = string.Empty;

    public Guid? ParentReplyId { get; set; }
    public DiscussionReply? ParentReply { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;

    public ICollection<DiscussionReply> ChildReplies { get; set; } = new List<DiscussionReply>();
    public ICollection<DiscussionAttachment> Attachments { get; set; } = new List<DiscussionAttachment>();
}
