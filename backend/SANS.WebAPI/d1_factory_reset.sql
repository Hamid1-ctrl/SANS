-- ══════════════════════════════════════════════════════════════════════════════
--  SANS D1 FACTORY RESET
--
--  Drops EVERY table in the database so you can re-apply the FIXED schema and the
--  seed data. Use this when an existing D1 database was created from the OLD (broken)
--  schema and keeps failing with errors like "no column named CreatedByUserId".
--
--  ⚠️ THIS DELETES ALL DATA in the database. Run it only if you are OK starting
--     fresh (the seed data below re-creates the admin account and demo records).
--
--  Run these three commands (replacing <DATABASE_NAME>):
--    npx wrangler d1 execute <DATABASE_NAME> --remote --file=d1_factory_reset.sql
--    npx wrangler d1 execute <DATABASE_NAME> --remote --file=cloudflare_d1_schema.sql
--    npx wrangler d1 execute <DATABASE_NAME> --remote --file=d1_seed_data.sql
--
--  The same database ID is kept, so NO environment variable changes are needed.
--  Tables are dropped in FK-safe order (children before parents) because Cloudflare
--  D1 enforces foreign keys.
-- ══════════════════════════════════════════════════════════════════════════════

PRAGMA foreign_keys = OFF;

-- Leftover tables from any earlier (unsafe) DROP/RENAME migration attempts
DROP TABLE IF EXISTS "RepProposals_v2";
DROP TABLE IF EXISTS "DiscussionAttachments_v2";
DROP TABLE IF EXISTS "DiscussionReplies_v2";
DROP TABLE IF EXISTS "DiscussionThreads_v2";
DROP TABLE IF EXISTS "Messages_v2";
DROP TABLE IF EXISTS "ChannelMembers_v2";
DROP TABLE IF EXISTS "Notifications_v2";
DROP TABLE IF EXISTS "AssignmentSubmissions_v2";
DROP TABLE IF EXISTS "AnnouncementEngagements_v2";
DROP TABLE IF EXISTS "Schedules_v2";
DROP TABLE IF EXISTS "Quizzes_v2";
DROP TABLE IF EXISTS "LearningResources_v2";
DROP TABLE IF EXISTS "ClassEnrollments_v2";
DROP TABLE IF EXISTS "Channels_v2";
DROP TABLE IF EXISTS "Assignments_v2";
DROP TABLE IF EXISTS "Announcements_v2";
DROP TABLE IF EXISTS "RefreshTokens_v2";
DROP TABLE IF EXISTS "Exams_v2";
DROP TABLE IF EXISTS "ClassWorkspaces_v2";
DROP TABLE IF EXISTS "Bookmarks_v2";
DROP TABLE IF EXISTS "AuditLogs_v2";
DROP TABLE IF EXISTS "Users_v2";
DROP TABLE IF EXISTS "Departments_v2";

-- All app tables, children first
DROP TABLE IF EXISTS "RepProposals";
DROP TABLE IF EXISTS "DiscussionAttachments";
DROP TABLE IF EXISTS "DiscussionReplies";
DROP TABLE IF EXISTS "DiscussionThreads";
DROP TABLE IF EXISTS "Messages";
DROP TABLE IF EXISTS "ChannelMembers";
DROP TABLE IF EXISTS "Notifications";
DROP TABLE IF EXISTS "AssignmentSubmissions";
DROP TABLE IF EXISTS "AnnouncementEngagements";
DROP TABLE IF EXISTS "Schedules";
DROP TABLE IF EXISTS "Quizzes";
DROP TABLE IF EXISTS "LearningResources";
DROP TABLE IF EXISTS "ClassEnrollments";
DROP TABLE IF EXISTS "Channels";
DROP TABLE IF EXISTS "Assignments";
DROP TABLE IF EXISTS "Announcements";
DROP TABLE IF EXISTS "RefreshTokens";
DROP TABLE IF EXISTS "Exams";
DROP TABLE IF EXISTS "ClassWorkspaces";
DROP TABLE IF EXISTS "Bookmarks";
DROP TABLE IF EXISTS "AuditLogs";
DROP TABLE IF EXISTS "Users";
DROP TABLE IF EXISTS "Departments";

PRAGMA foreign_keys = ON;
