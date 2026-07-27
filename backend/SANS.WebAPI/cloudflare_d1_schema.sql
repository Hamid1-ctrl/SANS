CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
    "ProductVersion" TEXT NOT NULL
);

BEGIN TRANSACTION;
CREATE TABLE "Departments" (
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

CREATE TABLE "Users" (
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
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Users_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE SET NULL
);

CREATE TABLE "AuditLogs" (
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

CREATE TABLE "Bookmarks" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Bookmarks" PRIMARY KEY,
    "UserId" TEXT NOT NULL,
    "EntityType" TEXT NOT NULL,
    "EntityId" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Bookmarks_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "ClassWorkspaces" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ClassWorkspaces" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Code" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "LecturerId" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_ClassWorkspaces_Users_LecturerId" FOREIGN KEY ("LecturerId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE "Exams" (
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

CREATE TABLE "RefreshTokens" (
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

CREATE TABLE "Announcements" (
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
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Announcements_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Announcements_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE SET NULL
);

CREATE TABLE "Assignments" (
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
    "DepartmentId" TEXT NOT NULL,
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
    CONSTRAINT "FK_Assignments_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Assignments_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE "Channels" (
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

CREATE TABLE "ClassEnrollments" (
    "EnrolledClassesId" TEXT NOT NULL,
    "StudentsId" TEXT NOT NULL,
    CONSTRAINT "PK_ClassEnrollments" PRIMARY KEY ("EnrolledClassesId", "StudentsId"),
    CONSTRAINT "FK_ClassEnrollments_ClassWorkspaces_EnrolledClassesId" FOREIGN KEY ("EnrolledClassesId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ClassEnrollments_Users_StudentsId" FOREIGN KEY ("StudentsId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "LearningResources" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_LearningResources" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "FileUrl" TEXT NOT NULL,
    "FileType" TEXT NOT NULL,
    "FileSize" INTEGER NOT NULL,
    "Category" TEXT NOT NULL,
    "Tags" TEXT NOT NULL,
    "DepartmentId" TEXT NOT NULL,
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
    CONSTRAINT "FK_LearningResources_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_LearningResources_Users_UploadedByUserId" FOREIGN KEY ("UploadedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE "Quizzes" (
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

CREATE TABLE "Schedules" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Schedules" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "StartTime" TEXT NOT NULL,
    "EndTime" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Room" TEXT NOT NULL,
    "DepartmentId" TEXT NOT NULL,
    "IsRecurring" INTEGER NOT NULL,
    "RecurrencePattern" TEXT NULL,
    "InstructorId" TEXT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Schedules_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Schedules_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Schedules_Users_InstructorId" FOREIGN KEY ("InstructorId") REFERENCES "Users" ("Id") ON DELETE SET NULL
);

CREATE TABLE "AnnouncementEngagements" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AnnouncementEngagements" PRIMARY KEY,
    "AnnouncementId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "ActionType" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_AnnouncementEngagements_Announcements_AnnouncementId" FOREIGN KEY ("AnnouncementId") REFERENCES "Announcements" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AnnouncementEngagements_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "AssignmentSubmissions" (
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

CREATE TABLE "Notifications" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Notifications" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Message" TEXT NOT NULL,
    "Type" INTEGER NOT NULL,
    "Priority" INTEGER NOT NULL,
    "IsRead" INTEGER NOT NULL,
    "ReadAt" TEXT NULL,
    "UserId" TEXT NOT NULL,
    "AnnouncementId" TEXT NULL,
    "AssignmentId" TEXT NULL,
    "ActionUrl" TEXT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Notifications_Announcements_AnnouncementId" FOREIGN KEY ("AnnouncementId") REFERENCES "Announcements" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Notifications_Assignments_AssignmentId" FOREIGN KEY ("AssignmentId") REFERENCES "Assignments" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Notifications_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Notifications_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "ChannelMembers" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ChannelMembers" PRIMARY KEY,
    "ChannelId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "JoinedAt" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_ChannelMembers_Channels_ChannelId" FOREIGN KEY ("ChannelId") REFERENCES "Channels" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ChannelMembers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Messages" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Messages" PRIMARY KEY,
    "Content" TEXT NOT NULL,
    "SenderId" TEXT NOT NULL,
    "ReceiverId" TEXT NOT NULL,
    "ChannelId" TEXT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "IsRead" INTEGER NOT NULL,
    "ReadAt" TEXT NULL,
    "AttachmentUrl" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_Messages_Channels_ChannelId" FOREIGN KEY ("ChannelId") REFERENCES "Channels" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Messages_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Messages_Users_ReceiverId" FOREIGN KEY ("ReceiverId") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Messages_Users_SenderId" FOREIGN KEY ("SenderId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

INSERT INTO "Departments" ("Id", "Code", "CreatedAt", "CreatedBy", "DeletedAt", "Description", "IsActive", "IsDeleted", "Name", "UpdatedAt", "UpdatedBy")
VALUES ('11111111-1111-1111-1111-111111111111', 'CSSE', '2026-07-04 00:00:00', NULL, NULL, 'Core computing department', 1, 0, 'Computer Science & Software Engineering', NULL, NULL);
SELECT changes();


INSERT INTO "Users" ("Id", "Bio", "CreatedAt", "CreatedBy", "DeletedAt", "DepartmentId", "DepartmentName", "Email", "FirebaseUid", "FirstName", "IsActive", "IsDeleted", "LastLoginAt", "LastName", "OfficeHours", "OfficeNumber", "PasswordHash", "PhoneNumber", "ProfileImageUrl", "Role", "Specialization", "StudentId", "UpdatedAt", "UpdatedBy")
VALUES ('22222222-2222-2222-2222-222222222222', NULL, '2026-07-04 00:00:00', 'System', NULL, '11111111-1111-1111-1111-111111111111', NULL, 'student.sans@sans.edu', NULL, 'Student', 1, 0, NULL, 'User', NULL, NULL, 'XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=', '+15551234567', NULL, 0, NULL, 'SANS-STU-2026', NULL, NULL);
SELECT changes();

INSERT INTO "Users" ("Id", "Bio", "CreatedAt", "CreatedBy", "DeletedAt", "DepartmentId", "DepartmentName", "Email", "FirebaseUid", "FirstName", "IsActive", "IsDeleted", "LastLoginAt", "LastName", "OfficeHours", "OfficeNumber", "PasswordHash", "PhoneNumber", "ProfileImageUrl", "Role", "Specialization", "StudentId", "UpdatedAt", "UpdatedBy")
VALUES ('33333333-3333-3333-3333-333333333333', NULL, '2026-07-04 00:00:00', 'System', NULL, '11111111-1111-1111-1111-111111111111', NULL, 'lecturer.sans@sans.edu', NULL, 'Lecturer', 1, 0, NULL, 'User', NULL, NULL, 'XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=', '+15559876543', NULL, 1, NULL, 'SANS-LEC-2026', NULL, NULL);
SELECT changes();

INSERT INTO "Users" ("Id", "Bio", "CreatedAt", "CreatedBy", "DeletedAt", "DepartmentId", "DepartmentName", "Email", "FirebaseUid", "FirstName", "IsActive", "IsDeleted", "LastLoginAt", "LastName", "OfficeHours", "OfficeNumber", "PasswordHash", "PhoneNumber", "ProfileImageUrl", "Role", "Specialization", "StudentId", "UpdatedAt", "UpdatedBy")
VALUES ('44444444-4444-4444-4444-444444444444', NULL, '2026-07-04 00:00:00', 'System', NULL, '11111111-1111-1111-1111-111111111111', NULL, 'rep.sans@sans.edu', NULL, 'Rep', 1, 0, NULL, 'User', NULL, NULL, 'XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=', '+15554321098', NULL, 2, NULL, 'SANS-REP-2026', NULL, NULL);
SELECT changes();


CREATE INDEX "IX_AnnouncementEngagements_AnnouncementId" ON "AnnouncementEngagements" ("AnnouncementId");

CREATE INDEX "IX_AnnouncementEngagements_UserId" ON "AnnouncementEngagements" ("UserId");

CREATE INDEX "IX_Announcements_ClassWorkspaceId" ON "Announcements" ("ClassWorkspaceId");

CREATE INDEX "IX_Announcements_DepartmentId" ON "Announcements" ("DepartmentId");

CREATE INDEX "IX_Assignments_ClassWorkspaceId" ON "Assignments" ("ClassWorkspaceId");

CREATE INDEX "IX_Assignments_CreatedByUserId" ON "Assignments" ("CreatedByUserId");

CREATE INDEX "IX_Assignments_DepartmentId" ON "Assignments" ("DepartmentId");

CREATE INDEX "IX_AssignmentSubmissions_AssignmentId" ON "AssignmentSubmissions" ("AssignmentId");

CREATE INDEX "IX_AssignmentSubmissions_GradedByUserId" ON "AssignmentSubmissions" ("GradedByUserId");

CREATE INDEX "IX_AssignmentSubmissions_StudentId" ON "AssignmentSubmissions" ("StudentId");

CREATE INDEX "IX_AuditLogs_UserId" ON "AuditLogs" ("UserId");

CREATE INDEX "IX_Bookmarks_UserId" ON "Bookmarks" ("UserId");

CREATE INDEX "IX_ChannelMembers_ChannelId" ON "ChannelMembers" ("ChannelId");

CREATE INDEX "IX_ChannelMembers_UserId" ON "ChannelMembers" ("UserId");

CREATE INDEX "IX_Channels_ClassWorkspaceId" ON "Channels" ("ClassWorkspaceId");

CREATE INDEX "IX_Channels_CreatedByUserId" ON "Channels" ("CreatedByUserId");

CREATE INDEX "IX_Channels_DepartmentId" ON "Channels" ("DepartmentId");

CREATE INDEX "IX_ClassEnrollments_StudentsId" ON "ClassEnrollments" ("StudentsId");

CREATE UNIQUE INDEX "IX_ClassWorkspaces_Code" ON "ClassWorkspaces" ("Code");

CREATE INDEX "IX_ClassWorkspaces_LecturerId" ON "ClassWorkspaces" ("LecturerId");

CREATE UNIQUE INDEX "IX_Departments_Code" ON "Departments" ("Code");

CREATE INDEX "IX_Exams_CreatedByUserId" ON "Exams" ("CreatedByUserId");

CREATE INDEX "IX_Exams_DepartmentId" ON "Exams" ("DepartmentId");

CREATE INDEX "IX_LearningResources_ClassWorkspaceId" ON "LearningResources" ("ClassWorkspaceId");

CREATE INDEX "IX_LearningResources_DepartmentId" ON "LearningResources" ("DepartmentId");

CREATE INDEX "IX_LearningResources_UploadedByUserId" ON "LearningResources" ("UploadedByUserId");

CREATE INDEX "IX_Messages_ChannelId" ON "Messages" ("ChannelId");

CREATE INDEX "IX_Messages_ClassWorkspaceId" ON "Messages" ("ClassWorkspaceId");

CREATE INDEX "IX_Messages_ReceiverId" ON "Messages" ("ReceiverId");

CREATE INDEX "IX_Messages_SenderId" ON "Messages" ("SenderId");

CREATE INDEX "IX_Notifications_AnnouncementId" ON "Notifications" ("AnnouncementId");

CREATE INDEX "IX_Notifications_AssignmentId" ON "Notifications" ("AssignmentId");

CREATE INDEX "IX_Notifications_ClassWorkspaceId" ON "Notifications" ("ClassWorkspaceId");

CREATE INDEX "IX_Notifications_UserId" ON "Notifications" ("UserId");

CREATE INDEX "IX_Quizzes_ClassWorkspaceId" ON "Quizzes" ("ClassWorkspaceId");

CREATE UNIQUE INDEX "IX_RefreshTokens_Token" ON "RefreshTokens" ("Token");

CREATE INDEX "IX_RefreshTokens_UserId" ON "RefreshTokens" ("UserId");

CREATE INDEX "IX_Schedules_ClassWorkspaceId" ON "Schedules" ("ClassWorkspaceId");

CREATE INDEX "IX_Schedules_DepartmentId" ON "Schedules" ("DepartmentId");

CREATE INDEX "IX_Schedules_InstructorId" ON "Schedules" ("InstructorId");

CREATE INDEX "IX_Users_DepartmentId" ON "Users" ("DepartmentId");

CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");

CREATE UNIQUE INDEX "IX_Users_FirebaseUid" ON "Users" ("FirebaseUid");

CREATE UNIQUE INDEX "IX_Users_StudentId" ON "Users" ("StudentId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260711193650_InitialSQLite', '10.0.9');

COMMIT;

BEGIN TRANSACTION;
CREATE TABLE "ef_temp_Assignments" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Assignments" PRIMARY KEY,
    "AllowLateSubmission" INTEGER NOT NULL,
    "AttachmentUrl" TEXT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "CreatedBy" TEXT NULL,
    "CreatedByUserId" TEXT NOT NULL,
    "DeletedAt" TEXT NULL,
    "DepartmentId" TEXT NULL,
    "Description" TEXT NOT NULL,
    "DueDate" TEXT NOT NULL,
    "Instructions" TEXT NOT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "LateSubmissionPenalty" TEXT NULL,
    "MaxPoints" TEXT NOT NULL,
    "PublishedAt" TEXT NULL,
    "Status" INTEGER NOT NULL,
    "Title" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    CONSTRAINT "FK_Assignments_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Assignments_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Assignments_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

INSERT INTO "ef_temp_Assignments" ("Id", "AllowLateSubmission", "AttachmentUrl", "ClassWorkspaceId", "CreatedAt", "CreatedBy", "CreatedByUserId", "DeletedAt", "DepartmentId", "Description", "DueDate", "Instructions", "IsDeleted", "LateSubmissionPenalty", "MaxPoints", "PublishedAt", "Status", "Title", "UpdatedAt", "UpdatedBy")
SELECT "Id", "AllowLateSubmission", "AttachmentUrl", "ClassWorkspaceId", "CreatedAt", "CreatedBy", "CreatedByUserId", "DeletedAt", "DepartmentId", "Description", "DueDate", "Instructions", "IsDeleted", "LateSubmissionPenalty", "MaxPoints", "PublishedAt", "Status", "Title", "UpdatedAt", "UpdatedBy"
FROM "Assignments";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "Assignments";

ALTER TABLE "ef_temp_Assignments" RENAME TO "Assignments";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE INDEX "IX_Assignments_ClassWorkspaceId" ON "Assignments" ("ClassWorkspaceId");

CREATE INDEX "IX_Assignments_CreatedByUserId" ON "Assignments" ("CreatedByUserId");

CREATE INDEX "IX_Assignments_DepartmentId" ON "Assignments" ("DepartmentId");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260717003536_MakeAssignmentDepartmentIdNullable', '10.0.9');

BEGIN TRANSACTION;
ALTER TABLE "ClassWorkspaces" ADD "AcademicLevel" TEXT NULL;

ALTER TABLE "ClassWorkspaces" ADD "CourseCode" TEXT NULL;

ALTER TABLE "ClassWorkspaces" ADD "CreatedByUserId" TEXT NULL;

ALTER TABLE "ClassWorkspaces" ADD "DepartmentText" TEXT NULL;

ALTER TABLE "ClassWorkspaces" ADD "Semester" TEXT NULL;

ALTER TABLE "Announcements" ADD "Category" TEXT NOT NULL DEFAULT 'General';

ALTER TABLE "Announcements" ADD "Priority" TEXT NOT NULL DEFAULT 'General';

CREATE TABLE "ef_temp_ClassWorkspaces" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ClassWorkspaces" PRIMARY KEY,
    "AcademicLevel" TEXT NULL,
    "Code" TEXT NOT NULL,
    "CourseCode" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "CreatedBy" TEXT NULL,
    "CreatedByUserId" TEXT NULL,
    "DeletedAt" TEXT NULL,
    "DepartmentText" TEXT NULL,
    "Description" TEXT NOT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "LecturerId" TEXT NULL,
    "Name" TEXT NOT NULL,
    "Semester" TEXT NULL,
    "UpdatedAt" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    CONSTRAINT "FK_ClassWorkspaces_Users_LecturerId" FOREIGN KEY ("LecturerId") REFERENCES "Users" ("Id") ON DELETE SET NULL
);

INSERT INTO "ef_temp_ClassWorkspaces" ("Id", "AcademicLevel", "Code", "CourseCode", "CreatedAt", "CreatedBy", "CreatedByUserId", "DeletedAt", "DepartmentText", "Description", "IsDeleted", "LecturerId", "Name", "Semester", "UpdatedAt", "UpdatedBy")
SELECT "Id", "AcademicLevel", "Code", "CourseCode", "CreatedAt", "CreatedBy", "CreatedByUserId", "DeletedAt", "DepartmentText", "Description", "IsDeleted", "LecturerId", "Name", "Semester", "UpdatedAt", "UpdatedBy"
FROM "ClassWorkspaces";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "ClassWorkspaces";

ALTER TABLE "ef_temp_ClassWorkspaces" RENAME TO "ClassWorkspaces";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE UNIQUE INDEX "IX_ClassWorkspaces_Code" ON "ClassWorkspaces" ("Code");

CREATE INDEX "IX_ClassWorkspaces_LecturerId" ON "ClassWorkspaces" ("LecturerId");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260717102501_EnhancedAnnouncementsAndClassWorkspace', '10.0.9');

BEGIN TRANSACTION;
ALTER TABLE "Assignments" ADD "AttachmentFileName" TEXT NULL;

ALTER TABLE "Assignments" ADD "AttachmentFileSize" INTEGER NULL;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260717104132_AddAssignmentFileMetadata', '10.0.9');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Users" ADD "Status" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ClassWorkspaces" ADD "ClassRepresentativeId" TEXT NULL;

UPDATE "Users" SET "Status" = 1
WHERE "Id" = '22222222-2222-2222-2222-222222222222';
SELECT changes();


UPDATE "Users" SET "Status" = 1
WHERE "Id" = '33333333-3333-3333-3333-333333333333';
SELECT changes();


UPDATE "Users" SET "Status" = 1
WHERE "Id" = '44444444-4444-4444-4444-444444444444';
SELECT changes();


INSERT INTO "Users" ("Id", "Bio", "CreatedAt", "CreatedBy", "DeletedAt", "DepartmentId", "DepartmentName", "Email", "FirebaseUid", "FirstName", "IsActive", "IsDeleted", "LastLoginAt", "LastName", "OfficeHours", "OfficeNumber", "PasswordHash", "PhoneNumber", "ProfileImageUrl", "Role", "Specialization", "Status", "StudentId", "UpdatedAt", "UpdatedBy")
VALUES ('55555555-5555-5555-5555-555555555555', NULL, '2026-07-04 00:00:00', 'System', NULL, '11111111-1111-1111-1111-111111111111', NULL, 'admin.sans@sans.edu', NULL, 'Admin', 1, 0, NULL, 'User', NULL, NULL, 'XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=', '+15550000000', NULL, 3, NULL, 1, 'SANS-ADM-2026', NULL, NULL);
SELECT changes();


CREATE INDEX "IX_ClassWorkspaces_ClassRepresentativeId" ON "ClassWorkspaces" ("ClassRepresentativeId");

CREATE TABLE "ef_temp_ClassWorkspaces" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ClassWorkspaces" PRIMARY KEY,
    "AcademicLevel" TEXT NULL,
    "ClassRepresentativeId" TEXT NULL,
    "Code" TEXT NOT NULL,
    "CourseCode" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "CreatedBy" TEXT NULL,
    "CreatedByUserId" TEXT NULL,
    "DeletedAt" TEXT NULL,
    "DepartmentText" TEXT NULL,
    "Description" TEXT NOT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "LecturerId" TEXT NULL,
    "Name" TEXT NOT NULL,
    "Semester" TEXT NULL,
    "UpdatedAt" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    CONSTRAINT "FK_ClassWorkspaces_Users_ClassRepresentativeId" FOREIGN KEY ("ClassRepresentativeId") REFERENCES "Users" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_ClassWorkspaces_Users_LecturerId" FOREIGN KEY ("LecturerId") REFERENCES "Users" ("Id") ON DELETE SET NULL
);

INSERT INTO "ef_temp_ClassWorkspaces" ("Id", "AcademicLevel", "ClassRepresentativeId", "Code", "CourseCode", "CreatedAt", "CreatedBy", "CreatedByUserId", "DeletedAt", "DepartmentText", "Description", "IsDeleted", "LecturerId", "Name", "Semester", "UpdatedAt", "UpdatedBy")
SELECT "Id", "AcademicLevel", "ClassRepresentativeId", "Code", "CourseCode", "CreatedAt", "CreatedBy", "CreatedByUserId", "DeletedAt", "DepartmentText", "Description", "IsDeleted", "LecturerId", "Name", "Semester", "UpdatedAt", "UpdatedBy"
FROM "ClassWorkspaces";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "ClassWorkspaces";

ALTER TABLE "ef_temp_ClassWorkspaces" RENAME TO "ClassWorkspaces";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE INDEX "IX_ClassWorkspaces_ClassRepresentativeId" ON "ClassWorkspaces" ("ClassRepresentativeId");

CREATE UNIQUE INDEX "IX_ClassWorkspaces_Code" ON "ClassWorkspaces" ("Code");

CREATE INDEX "IX_ClassWorkspaces_LecturerId" ON "ClassWorkspaces" ("LecturerId");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260719064349_AddUserStatusAndClassRep', '10.0.9');

BEGIN TRANSACTION;
CREATE TABLE "DiscussionThreads" (
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

CREATE TABLE "DiscussionReplies" (
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

CREATE TABLE "DiscussionAttachments" (
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

CREATE INDEX "IX_DiscussionAttachments_DiscussionReplyId" ON "DiscussionAttachments" ("DiscussionReplyId");

CREATE INDEX "IX_DiscussionAttachments_DiscussionThreadId" ON "DiscussionAttachments" ("DiscussionThreadId");

CREATE INDEX "IX_DiscussionReplies_AuthorId" ON "DiscussionReplies" ("AuthorId");

CREATE INDEX "IX_DiscussionReplies_DiscussionThreadId" ON "DiscussionReplies" ("DiscussionThreadId");

CREATE INDEX "IX_DiscussionReplies_ParentReplyId" ON "DiscussionReplies" ("ParentReplyId");

CREATE INDEX "IX_DiscussionThreads_AuthorId" ON "DiscussionThreads" ("AuthorId");

CREATE INDEX "IX_DiscussionThreads_ClassWorkspaceId" ON "DiscussionThreads" ("ClassWorkspaceId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260724101051_AddDiscussionForumEntities', '10.0.9');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Schedules" ADD "AcademicLevel" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Schedules" ADD "Building" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Schedules" ADD "CourseCode" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Schedules" ADD "CourseTitle" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Schedules" ADD "DayOfWeek" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Schedules" ADD "IsMaster" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Schedules" ADD "IsPublished" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Schedules" ADD "LectureType" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Schedules" ADD "LecturerName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Schedules" ADD "Notes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Schedules" ADD "Semester" TEXT NOT NULL DEFAULT '';

CREATE INDEX "IX_Schedules_DayOfWeek" ON "Schedules" ("DayOfWeek");

CREATE INDEX "IX_Schedules_IsMaster" ON "Schedules" ("IsMaster");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260724104603_AddAcademicTimetableFields', '10.0.9');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Schedules" ADD "FileName" TEXT NULL;

ALTER TABLE "Schedules" ADD "FileSize" INTEGER NULL;

ALTER TABLE "Schedules" ADD "FileType" TEXT NULL;

ALTER TABLE "Schedules" ADD "FileUrl" TEXT NULL;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260724112119_FixScheduleFileColumns', '10.0.9');

COMMIT;

BEGIN TRANSACTION;
CREATE TABLE "ef_temp_Schedules" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Schedules" PRIMARY KEY,
    "AcademicLevel" TEXT NOT NULL,
    "Building" TEXT NOT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "CourseCode" TEXT NOT NULL,
    "CourseTitle" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "CreatedBy" TEXT NULL,
    "DayOfWeek" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    "DepartmentId" TEXT NULL,
    "Description" TEXT NOT NULL,
    "EndTime" TEXT NOT NULL,
    "FileName" TEXT NULL,
    "FileSize" INTEGER NULL,
    "FileType" TEXT NULL,
    "FileUrl" TEXT NULL,
    "InstructorId" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "IsMaster" INTEGER NOT NULL,
    "IsPublished" INTEGER NOT NULL,
    "IsRecurring" INTEGER NOT NULL,
    "LectureType" TEXT NOT NULL,
    "LecturerName" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Notes" TEXT NOT NULL,
    "RecurrencePattern" TEXT NULL,
    "Room" TEXT NOT NULL,
    "Semester" TEXT NOT NULL,
    "StartTime" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    CONSTRAINT "FK_Schedules_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Schedules_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Schedules_Users_InstructorId" FOREIGN KEY ("InstructorId") REFERENCES "Users" ("Id") ON DELETE SET NULL
);

INSERT INTO "ef_temp_Schedules" ("Id", "AcademicLevel", "Building", "ClassWorkspaceId", "CourseCode", "CourseTitle", "CreatedAt", "CreatedBy", "DayOfWeek", "DeletedAt", "DepartmentId", "Description", "EndTime", "FileName", "FileSize", "FileType", "FileUrl", "InstructorId", "IsDeleted", "IsMaster", "IsPublished", "IsRecurring", "LectureType", "LecturerName", "Location", "Notes", "RecurrencePattern", "Room", "Semester", "StartTime", "Title", "UpdatedAt", "UpdatedBy")
SELECT "Id", "AcademicLevel", "Building", "ClassWorkspaceId", "CourseCode", "CourseTitle", "CreatedAt", "CreatedBy", "DayOfWeek", "DeletedAt", "DepartmentId", "Description", "EndTime", "FileName", "FileSize", "FileType", "FileUrl", "InstructorId", "IsDeleted", "IsMaster", "IsPublished", "IsRecurring", "LectureType", "LecturerName", "Location", "Notes", "RecurrencePattern", "Room", "Semester", "StartTime", "Title", "UpdatedAt", "UpdatedBy"
FROM "Schedules";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "Schedules";

ALTER TABLE "ef_temp_Schedules" RENAME TO "Schedules";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE INDEX "IX_Schedules_ClassWorkspaceId" ON "Schedules" ("ClassWorkspaceId");

CREATE INDEX "IX_Schedules_DayOfWeek" ON "Schedules" ("DayOfWeek");

CREATE INDEX "IX_Schedules_DepartmentId" ON "Schedules" ("DepartmentId");

CREATE INDEX "IX_Schedules_InstructorId" ON "Schedules" ("InstructorId");

CREATE INDEX "IX_Schedules_IsMaster" ON "Schedules" ("IsMaster");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260725110929_MakeScheduleDepartmentIdNullable', '10.0.9');

BEGIN TRANSACTION;
ALTER TABLE "Users" ADD "IndexNumber" TEXT NULL;

UPDATE "Users" SET "IndexNumber" = NULL
WHERE "Id" = '22222222-2222-2222-2222-222222222222';
SELECT changes();


UPDATE "Users" SET "IndexNumber" = NULL
WHERE "Id" = '33333333-3333-3333-3333-333333333333';
SELECT changes();


UPDATE "Users" SET "IndexNumber" = NULL
WHERE "Id" = '44444444-4444-4444-4444-444444444444';
SELECT changes();


UPDATE "Users" SET "IndexNumber" = NULL
WHERE "Id" = '55555555-5555-5555-5555-555555555555';
SELECT changes();


INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260726143642_AddIndexNumberToUser', '10.0.9');

COMMIT;

