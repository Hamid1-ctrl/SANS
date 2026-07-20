using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SANS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnhancedAnnouncementsAndClassWorkspace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClassWorkspaces_Users_LecturerId",
                table: "ClassWorkspaces");

            migrationBuilder.AlterColumn<Guid>(
                name: "LecturerId",
                table: "ClassWorkspaces",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT");

            migrationBuilder.AddColumn<string>(
                name: "AcademicLevel",
                table: "ClassWorkspaces",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CourseCode",
                table: "ClassWorkspaces",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "ClassWorkspaces",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DepartmentText",
                table: "ClassWorkspaces",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Semester",
                table: "ClassWorkspaces",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Announcements",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "General");

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Announcements",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "General");

            migrationBuilder.AddForeignKey(
                name: "FK_ClassWorkspaces_Users_LecturerId",
                table: "ClassWorkspaces",
                column: "LecturerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClassWorkspaces_Users_LecturerId",
                table: "ClassWorkspaces");

            migrationBuilder.DropColumn(
                name: "AcademicLevel",
                table: "ClassWorkspaces");

            migrationBuilder.DropColumn(
                name: "CourseCode",
                table: "ClassWorkspaces");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "ClassWorkspaces");

            migrationBuilder.DropColumn(
                name: "DepartmentText",
                table: "ClassWorkspaces");

            migrationBuilder.DropColumn(
                name: "Semester",
                table: "ClassWorkspaces");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Announcements");

            migrationBuilder.AlterColumn<Guid>(
                name: "LecturerId",
                table: "ClassWorkspaces",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ClassWorkspaces_Users_LecturerId",
                table: "ClassWorkspaces",
                column: "LecturerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
