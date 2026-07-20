using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SANS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserStatusAndClassRep : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ClassRepresentativeId",
                table: "ClassWorkspaces",
                type: "TEXT",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "Status",
                value: 1);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "Status",
                value: 1);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "Status",
                value: 1);

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "Bio", "CreatedAt", "CreatedBy", "DeletedAt", "DepartmentId", "DepartmentName", "Email", "FirebaseUid", "FirstName", "IsActive", "IsDeleted", "LastLoginAt", "LastName", "OfficeHours", "OfficeNumber", "PasswordHash", "PhoneNumber", "ProfileImageUrl", "Role", "Specialization", "Status", "StudentId", "UpdatedAt", "UpdatedBy" },
                values: new object[] { new Guid("55555555-5555-5555-5555-555555555555"), null, new DateTime(2026, 7, 4, 0, 0, 0, 0, DateTimeKind.Utc), "System", null, new Guid("11111111-1111-1111-1111-111111111111"), null, "admin.sans@sans.edu", null, "Admin", true, false, null, "User", null, null, "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=", "+15550000000", null, 3, null, 1, "SANS-ADM-2026", null, null });

            migrationBuilder.CreateIndex(
                name: "IX_ClassWorkspaces_ClassRepresentativeId",
                table: "ClassWorkspaces",
                column: "ClassRepresentativeId");

            migrationBuilder.AddForeignKey(
                name: "FK_ClassWorkspaces_Users_ClassRepresentativeId",
                table: "ClassWorkspaces",
                column: "ClassRepresentativeId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClassWorkspaces_Users_ClassRepresentativeId",
                table: "ClassWorkspaces");

            migrationBuilder.DropIndex(
                name: "IX_ClassWorkspaces_ClassRepresentativeId",
                table: "ClassWorkspaces");

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"));

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ClassRepresentativeId",
                table: "ClassWorkspaces");
        }
    }
}
