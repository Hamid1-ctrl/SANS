CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
    "ProductVersion" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Departments" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Departments" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Code" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "IsActive" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "Users" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Users" PRIMARY KEY,
    "FirstName" TEXT NOT NULL,
    "LastName" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "PhoneNumber" TEXT NOT NULL,
    "StudentId" TEXT NOT NULL,
    "Role" INTEGER NOT NULL,
    "DepartmentId" TEXT NULL,
    "IsActive" INTEGER NOT NULL,
    "LastLoginAt" TEXT NULL,
    "ProfileImageUrl" TEXT NULL,
    "OfficeNumber" TEXT NULL,
    "OfficeHours" TEXT NULL,
    "Specialization" TEXT NULL,
    "Bio" TEXT NULL,
    "DepartmentName" TEXT NULL,
    "FirebaseUid" TEXT NULL,
    "Status" INTEGER NOT NULL DEFAULT 1,
    "IndexNumber" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Users_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "AuditLogs" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AuditLogs" PRIMARY KEY,
    "Action" TEXT NOT NULL,
    "EntityName" TEXT NOT NULL,
    "EntityId" TEXT NULL,
    "UserId" TEXT NOT NULL,
    "UserName" TEXT NULL,
    "Changes" TEXT NULL,
    "IpAddress" TEXT NOT NULL,
    "Timestamp" TEXT NOT NULL,
    CONSTRAINT "FK_AuditLogs_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Bookmarks" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Bookmarks" PRIMARY KEY,
    "UserId" TEXT NOT NULL,
    "EntityType" TEXT NOT NULL,
    "EntityId" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Bookmarks_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClassWorkspaces" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ClassWorkspaces" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Code" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "LecturerId" TEXT NOT NULL,
    "ClassRepresentativeId" TEXT NULL,
    "SecondClassRepresentativeId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_ClassWorkspaces_Users_LecturerId" FOREIGN KEY ("LecturerId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Exams" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Exams" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "ExamDate" TEXT NOT NULL,
    "StartTime" TEXT NOT NULL,
    "EndTime" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Room" TEXT NOT NULL,
    "MaxPoints" TEXT NOT NULL,
    "DepartmentId" TEXT NOT NULL,
    "CreatedByUserId" TEXT NOT NULL,
    "IsPublished" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Exams_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Exams_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "RefreshTokens" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_RefreshTokens" PRIMARY KEY,
    "Token" TEXT NOT NULL,
    "ExpiresAt" TEXT NOT NULL,
    "IsUsed" INTEGER NOT NULL,
    "IsRevoked" INTEGER NOT NULL,
    "RevokedAt" TEXT NULL,
    "UserId" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_RefreshTokens_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Announcements" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Announcements" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "IsGlobal" INTEGER NOT NULL,
    "DepartmentId" TEXT NULL,
    "TargetRoleId" TEXT NULL,
    "PublishedAt" TEXT NULL,
    "ExpiresAt" TEXT NULL,
    "IsPinned" INTEGER NOT NULL,
    "ViewCount" INTEGER NOT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "IsVerified" INTEGER NOT NULL,
    "Status" TEXT NULL,
    "Tags" TEXT NULL,
    "Priority" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Announcements_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Announcements_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Assignments" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Assignments" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "Instructions" TEXT NOT NULL,
    "DueDate" TEXT NOT NULL,
    "PublishedAt" TEXT NULL,
    "MaxPoints" TEXT NOT NULL,
    "Status" INTEGER NOT NULL,
    "AllowLateSubmission" INTEGER NOT NULL,
    "LateSubmissionPenalty" TEXT NULL,
    "DepartmentId" TEXT NULL,
    "CreatedByUserId" TEXT NOT NULL,
    "AttachmentUrl" TEXT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Assignments_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Assignments_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Channels" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Channels" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "IsGroup" INTEGER NOT NULL,
    "DepartmentId" TEXT NOT NULL,
    "CreatedByUserId" TEXT NOT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Channels_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Channels_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Channels_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "ClassEnrollments" (
    "EnrolledClassesId" TEXT NOT NULL,
    "StudentsId" TEXT NOT NULL,
    CONSTRAINT "PK_ClassEnrollments" PRIMARY KEY ("EnrolledClassesId", "StudentsId"),
    CONSTRAINT "FK_ClassEnrollments_ClassWorkspaces_EnrolledClassesId" FOREIGN KEY ("EnrolledClassesId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ClassEnrollments_Users_StudentsId" FOREIGN KEY ("StudentsId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "LearningResources" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_LearningResources" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "FileUrl" TEXT NOT NULL,
    "FileType" TEXT NOT NULL,
    "FileSize" INTEGER NOT NULL,
    "Category" TEXT NOT NULL,
    "Tags" TEXT NOT NULL,
    "DepartmentId" TEXT NULL,
    "UploadedByUserId" TEXT NOT NULL,
    "DownloadCount" INTEGER NOT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_LearningResources_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_LearningResources_Users_UploadedByUserId" FOREIGN KEY ("UploadedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Quizzes" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Quizzes" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Course" TEXT NOT NULL,
    "Date" TEXT NOT NULL,
    "Points" INTEGER NOT NULL,
    "QuestionsCount" INTEGER NOT NULL,
    "ClassWorkspaceId" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Quizzes_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Schedules" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Schedules" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "StartTime" TEXT NOT NULL,
    "EndTime" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Room" TEXT NOT NULL,
    "DepartmentId" TEXT NULL,
    "IsRecurring" INTEGER NOT NULL,
    "RecurrencePattern" TEXT NULL,
    "InstructorId" TEXT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "AcademicLevel" TEXT NOT NULL DEFAULT '',
    "Building" TEXT NOT NULL DEFAULT '',
    "CourseCode" TEXT NOT NULL DEFAULT '',
    "CourseTitle" TEXT NOT NULL DEFAULT '',
    "DayOfWeek" INTEGER NOT NULL DEFAULT 0,
    "IsMaster" INTEGER NOT NULL DEFAULT 0,
    "IsPublished" INTEGER NOT NULL DEFAULT 0,
    "LectureType" TEXT NOT NULL DEFAULT '',
    "LecturerName" TEXT NOT NULL DEFAULT '',
    "Notes" TEXT NOT NULL DEFAULT '',
    "Semester" TEXT NOT NULL DEFAULT '',
    "FileName" TEXT NULL,
    "FileSize" INTEGER NULL,
    "FileType" TEXT NULL,
    "FileUrl" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Schedules_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Schedules_Users_InstructorId" FOREIGN KEY ("InstructorId") REFERENCES "Users" ("Id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "AnnouncementEngagements" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AnnouncementEngagements" PRIMARY KEY,
    "AnnouncementId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "ActionType" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_AnnouncementEngagements_Announcements_AnnouncementId" FOREIGN KEY ("AnnouncementId") REFERENCES "Announcements" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AnnouncementEngagements_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AssignmentSubmissions" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AssignmentSubmissions" PRIMARY KEY,
    "AssignmentId" TEXT NOT NULL,
    "StudentId" TEXT NOT NULL,
    "SubmittedAt" TEXT NOT NULL,
    "Content" TEXT NULL,
    "AttachmentUrl" TEXT NULL,
    "Grade" TEXT NULL,
    "Feedback" TEXT NULL,
    "GradedAt" TEXT NULL,
    "GradedByUserId" TEXT NULL,
    "IsLateSubmission" INTEGER NOT NULL,
    "Status" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_AssignmentSubmissions_Assignments_AssignmentId" FOREIGN KEY ("AssignmentId") REFERENCES "Assignments" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AssignmentSubmissions_Users_GradedByUserId" FOREIGN KEY ("GradedByUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_AssignmentSubmissions_Users_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Notifications" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Notifications" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Message" TEXT NOT NULL,
    "Type" INTEGER NOT NULL,
    "Priority" INTEGER NOT NULL,
    "IsRead" INTEGER NOT NULL,
    "UserId" TEXT NOT NULL,
    "ActionUrl" TEXT NULL,
    "Metadata" TEXT NULL,
    "ReadAt" TEXT NULL,
    "DepartmentId" TEXT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Notifications_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ChannelMembers" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ChannelMembers" PRIMARY KEY,
    "ChannelId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Role" INTEGER NOT NULL,
    "JoinedAt" TEXT NOT NULL,
    "LastReadAt" TEXT NULL,
    "IsMuted" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_ChannelMembers_Channels_ChannelId" FOREIGN KEY ("ChannelId") REFERENCES "Channels" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ChannelMembers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Messages" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Messages" PRIMARY KEY,
    "Content" TEXT NOT NULL,
    "SenderId" TEXT NOT NULL,
    "ChannelId" TEXT NOT NULL,
    "ReplyToMessageId" TEXT NULL,
    "SentAt" TEXT NOT NULL,
    "IsEdited" INTEGER NOT NULL,
    "EditedAt" TEXT NULL,
    "Attachments" TEXT NULL,
    "IsRead" INTEGER NOT NULL,
    "ReadAt" TEXT NULL,
    "DepartmentId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Messages_Channels_ChannelId" FOREIGN KEY ("ChannelId") REFERENCES "Channels" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Messages_Messages_ReplyToMessageId" FOREIGN KEY ("ReplyToMessageId") REFERENCES "Messages" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Messages_Users_SenderId" FOREIGN KEY ("SenderId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "DiscussionThreads" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_DiscussionThreads" PRIMARY KEY,
    "ClassWorkspaceId" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "Category" TEXT NOT NULL,
    "AuthorId" TEXT NOT NULL,
    "IsPinned" INTEGER NOT NULL,
    "IsLocked" INTEGER NOT NULL,
    "RepliesCount" INTEGER NOT NULL,
    "LastActivityAt" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    CONSTRAINT "FK_DiscussionThreads_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_DiscussionThreads_Users_AuthorId" FOREIGN KEY ("AuthorId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "DiscussionReplies" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_DiscussionReplies" PRIMARY KEY,
    "DiscussionThreadId" TEXT NOT NULL,
    "AuthorId" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "ParentReplyId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    CONSTRAINT "FK_DiscussionReplies_DiscussionReplies_ParentReplyId" FOREIGN KEY ("ParentReplyId") REFERENCES "DiscussionReplies" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_DiscussionReplies_DiscussionThreads_DiscussionThreadId" FOREIGN KEY ("DiscussionThreadId") REFERENCES "DiscussionThreads" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_DiscussionReplies_Users_AuthorId" FOREIGN KEY ("AuthorId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "DiscussionAttachments" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_DiscussionAttachments" PRIMARY KEY,
    "DiscussionThreadId" TEXT NULL,
    "DiscussionReplyId" TEXT NULL,
    "FileName" TEXT NOT NULL,
    "FileUrl" TEXT NOT NULL,
    "FileType" TEXT NOT NULL,
    "FileSize" INTEGER NOT NULL,
    "UploadedAt" TEXT NOT NULL,
    CONSTRAINT "FK_DiscussionAttachments_DiscussionReplies_DiscussionReplyId" FOREIGN KEY ("DiscussionReplyId") REFERENCES "DiscussionReplies" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_DiscussionAttachments_DiscussionThreads_DiscussionThreadId" FOREIGN KEY ("DiscussionThreadId") REFERENCES "DiscussionThreads" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "RepProposals" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_RepProposals" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "Category" TEXT NOT NULL,
    "ClassWorkspaceId" TEXT NOT NULL,
    "SubmittedByUserId" TEXT NOT NULL,
    "SubmittedByName" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "LecturerComment" TEXT NULL,
    "ReviewedAt" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    CONSTRAINT "FK_RepProposals_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_RepProposals_Users_SubmittedByUserId" FOREIGN KEY ("SubmittedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);
