using System;

namespace SANS.Domain.Entities;

public class DiscussionAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? DiscussionThreadId { get; set; }
    public DiscussionThread? DiscussionThread { get; set; }

    public Guid? DiscussionReplyId { get; set; }
    public DiscussionReply? DiscussionReply { get; set; }

    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty; // pdf, image, word, ppt, etc.
    public long FileSize { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
