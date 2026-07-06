using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SANS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeedDefaultUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Departments",
                columns: new[] { "Id", "Code", "CreatedAt", "CreatedBy", "DeletedAt", "Description", "IsActive", "IsDeleted", "Name", "UpdatedAt", "UpdatedBy" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), "CSSE", new DateTime(2026, 7, 4, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Core computing department", true, false, "Computer Science & Software Engineering", null, null });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "CreatedBy", "DeletedAt", "DepartmentId", "Email", "FirstName", "IsActive", "IsDeleted", "LastLoginAt", "LastName", "PasswordHash", "PhoneNumber", "ProfileImageUrl", "Role", "StudentId", "UpdatedAt", "UpdatedBy" },
                values: new object[,]
                {
                    { new Guid("22222222-2222-2222-2222-222222222222"), new DateTime(2026, 7, 4, 0, 0, 0, 0, DateTimeKind.Utc), "System", null, new Guid("11111111-1111-1111-1111-111111111111"), "student.sans@sans.edu", "Student", true, false, null, "User", "XohImNooBHFR0ESv6PhydmL9U/0fJ+IsvW9EBf9RRe8=", "+15551234567", null, 0, "SANS-STU-2026", null, null },
                    { new Guid("33333333-3333-3333-3333-333333333333"), new DateTime(2026, 7, 4, 0, 0, 0, 0, DateTimeKind.Utc), "System", null, new Guid("11111111-1111-1111-1111-111111111111"), "lecturer.sans@sans.edu", "Lecturer", true, false, null, "User", "XohImNooBHFR0ESv6PhydmL9U/0fJ+IsvW9EBf9RRe8=", "+15559876543", null, 1, "SANS-LEC-2026", null, null },
                    { new Guid("44444444-4444-4444-4444-444444444444"), new DateTime(2026, 7, 4, 0, 0, 0, 0, DateTimeKind.Utc), "System", null, new Guid("11111111-1111-1111-1111-111111111111"), "rep.sans@sans.edu", "Rep", true, false, null, "User", "XohImNooBHFR0ESv6PhydmL9U/0fJ+IsvW9EBf9RRe8=", "+15554321098", null, 2, "SANS-REP-2026", null, null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"));

            migrationBuilder.DeleteData(
                table: "Departments",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));
        }
    }
}
