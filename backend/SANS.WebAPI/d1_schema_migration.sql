-- ══════════════════════════════════════════════════════════════════════════════
--  SANS D1 SCHEMA MIGRATION  (SAFE VERSION)
--
--  ⚠️ You do NOT need to run this file anymore. The backend repairs the schema
--     automatically on every boot (D1SchemaRepairer): it adds missing columns,
--     relaxes stale NOT NULL constraints and rebuilds any out-of-date table while
--     PRESERVING your data and respecting D1's enforced foreign keys (children are
--     rebuilt before their parents). Just redeploy the API.
--
--  This file is kept as an optional manual reference. It contains ONLY additive
--  ALTER TABLE ADD COLUMN statements, which never touch foreign keys and are safe
--  to run. The old DROP/RENAME table rebuilds were REMOVED because Cloudflare D1
--  ENFORCES foreign key constraints and ignores `PRAGMA foreign_keys = OFF` inside
--  its implicit transactions — dropping a parent table would cascade-delete
--  dependent rows in child tables.
--
--  Note: ALTER TABLE ADD COLUMN fails when the column already exists. If a column
--  is already present, skip that statement (or simply rely on the backend's
--  automatic repair, which is idempotent).
-- ══════════════════════════════════════════════════════════════════════════════

-- ClassWorkspaces: academic/creator columns. (LecturerId is relaxed to NULL by the
-- automatic repair — a Course Rep creates a class before any lecturer is assigned.)
ALTER TABLE "ClassWorkspaces" ADD COLUMN "CreatedByUserId" TEXT;
ALTER TABLE "ClassWorkspaces" ADD COLUMN "CourseCode" TEXT;
ALTER TABLE "ClassWorkspaces" ADD COLUMN "DepartmentText" TEXT;
ALTER TABLE "ClassWorkspaces" ADD COLUMN "AcademicLevel" TEXT;
ALTER TABLE "ClassWorkspaces" ADD COLUMN "Semester" TEXT;

-- Announcements: moderation category
ALTER TABLE "Announcements" ADD COLUMN "Category" TEXT;

-- Assignments: attachment metadata
ALTER TABLE "Assignments" ADD COLUMN "AttachmentFileName" TEXT;
ALTER TABLE "Assignments" ADD COLUMN "AttachmentFileSize" INTEGER;

-- Notifications: source entity links
ALTER TABLE "Notifications" ADD COLUMN "AnnouncementId" TEXT;
ALTER TABLE "Notifications" ADD COLUMN "AssignmentId" TEXT;

-- Guarantee the seeded admin account is an Administrator (the backend also
-- self-heals this on every login, so this is belt-and-braces).
UPDATE "Users" SET "Role" = 3, "Status" = 1, "IsActive" = 1 WHERE lower("Email") = 'admin.sans@sans.edu';
