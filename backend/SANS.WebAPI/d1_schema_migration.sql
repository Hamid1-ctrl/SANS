-- ══════════════════════════════════════════════════════════════════════════════
--  SANS D1 SCHEMA MIGRATION
--  Run this ONCE against an existing Cloudflare D1 database that was created
--  from the OLDER cloudflare_d1_schema.sql (the deployed version). It adds the
--  columns the current entities write and rebuilds three tables whose column
--  definitions were out of date (stale NOT NULL columns would otherwise reject
--  every INSERT).
--
--  Usage (replace <DATABASE_NAME> with your D1 database name):
--    npx wrangler d1 execute <DATABASE_NAME> --remote --file=d1_schema_migration.sql
--
--  NOT idempotent: do NOT run it against a database that was already created
--  from the FIXED schema (ALTER TABLE ADD COLUMN would fail on duplicate names).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── ClassWorkspaces: add the academic/creator columns the entity writes ───────
ALTER TABLE "ClassWorkspaces" ADD COLUMN "CreatedByUserId" TEXT;
ALTER TABLE "ClassWorkspaces" ADD COLUMN "CourseCode" TEXT;
ALTER TABLE "ClassWorkspaces" ADD COLUMN "DepartmentText" TEXT;
ALTER TABLE "ClassWorkspaces" ADD COLUMN "AcademicLevel" TEXT;
ALTER TABLE "ClassWorkspaces" ADD COLUMN "Semester" TEXT;

-- ── Announcements: add Category (Priority already existed) ────────────────────
ALTER TABLE "Announcements" ADD COLUMN "Category" TEXT;

-- ── Assignments: add the attachment metadata columns ──────────────────────────
ALTER TABLE "Assignments" ADD COLUMN "AttachmentFileName" TEXT;
ALTER TABLE "Assignments" ADD COLUMN "AttachmentFileSize" INTEGER;

-- ── Notifications: add the source entity links ────────────────────────────────
ALTER TABLE "Notifications" ADD COLUMN "AnnouncementId" TEXT;
ALTER TABLE "Notifications" ADD COLUMN "AssignmentId" TEXT;

-- ── Messages: rebuild (stale NOT NULL SentAt/IsEdited/ChannelId reject inserts
--    the current Message entity never writes) ─────────────────────────────────
CREATE TABLE "Messages_v2" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Messages" PRIMARY KEY,
    "Content" TEXT NOT NULL,
    "SenderId" TEXT NOT NULL,
    "ChannelId" TEXT NULL,
    "ReceiverId" TEXT NULL,
    "ClassWorkspaceId" TEXT NULL,
    "AttachmentUrl" TEXT NULL,
    "ReplyToMessageId" TEXT NULL,
    "SentAt" TEXT NULL,
    "IsEdited" INTEGER NOT NULL DEFAULT 0,
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
INSERT INTO "Messages_v2" ("Id", "Content", "SenderId", "ChannelId", "ReplyToMessageId", "SentAt", "IsEdited", "EditedAt", "Attachments", "IsRead", "ReadAt", "DepartmentId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "IsDeleted", "DeletedAt", "ReceiverId", "ClassWorkspaceId", "AttachmentUrl")
SELECT "Id", "Content", "SenderId", "ChannelId", "ReplyToMessageId", "SentAt", "IsEdited", "EditedAt", "Attachments", "IsRead", "ReadAt", "DepartmentId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "IsDeleted", "DeletedAt", NULL, NULL, NULL FROM "Messages";
DROP TABLE "Messages";
ALTER TABLE "Messages_v2" RENAME TO "Messages";

-- ── ChannelMembers: rebuild (entity never writes Role / IsMuted) ──────────────
CREATE TABLE "ChannelMembers_v2" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_ChannelMembers" PRIMARY KEY,
    "ChannelId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Role" INTEGER NULL,
    "JoinedAt" TEXT NOT NULL,
    "LastReadAt" TEXT NULL,
    "IsMuted" INTEGER NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "CreatedBy" TEXT NULL,
    "UpdatedBy" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    "DeletedAt" TEXT NULL,
    CONSTRAINT "FK_ChannelMembers_Channels_ChannelId" FOREIGN KEY ("ChannelId") REFERENCES "Channels" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ChannelMembers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);
INSERT INTO "ChannelMembers_v2" ("Id", "ChannelId", "UserId", "Role", "JoinedAt", "LastReadAt", "IsMuted", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "IsDeleted", "DeletedAt")
SELECT "Id", "ChannelId", "UserId", "Role", "JoinedAt", "LastReadAt", "IsMuted", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "IsDeleted", "DeletedAt" FROM "ChannelMembers";
DROP TABLE "ChannelMembers";
ALTER TABLE "ChannelMembers_v2" RENAME TO "ChannelMembers";

-- ── RepProposals: rebuild (entity writes SubmittedByRepId / LecturerFeedback,
--    never Category / SubmittedByUserId / SubmittedByName) ────────────────────
CREATE TABLE "RepProposals_v2" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_RepProposals" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "Category" TEXT NULL,
    "ClassWorkspaceId" TEXT NOT NULL,
    "SubmittedByUserId" TEXT NULL,
    "SubmittedByRepId" TEXT NULL,
    "SubmittedByName" TEXT NULL,
    "Status" TEXT NOT NULL,
    "LecturerFeedback" TEXT NULL,
    "LecturerComment" TEXT NULL,
    "ReviewedAt" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NULL,
    "IsDeleted" INTEGER NOT NULL,
    CONSTRAINT "FK_RepProposals_ClassWorkspaces_ClassWorkspaceId" FOREIGN KEY ("ClassWorkspaceId") REFERENCES "ClassWorkspaces" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_RepProposals_Users_SubmittedByUserId" FOREIGN KEY ("SubmittedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);
INSERT INTO "RepProposals_v2" ("Id", "Title", "Description", "Category", "ClassWorkspaceId", "SubmittedByUserId", "SubmittedByName", "Status", "LecturerComment", "ReviewedAt", "CreatedAt", "UpdatedAt", "IsDeleted", "SubmittedByRepId", "LecturerFeedback")
SELECT "Id", "Title", "Description", "Category", "ClassWorkspaceId", "SubmittedByUserId", "SubmittedByName", "Status", "LecturerComment", "ReviewedAt", "CreatedAt", "UpdatedAt", "IsDeleted", NULL, NULL FROM "RepProposals";
DROP TABLE "RepProposals";
ALTER TABLE "RepProposals_v2" RENAME TO "RepProposals";

-- ── Guarantee the seeded admin account is an Administrator (the backend also
--    self-heals this on every login, so this is belt-and-braces) ──────────────
UPDATE "Users" SET "Role" = 3, "Status" = 1, "IsActive" = 1 WHERE lower("Email") = 'admin.sans@sans.edu';
