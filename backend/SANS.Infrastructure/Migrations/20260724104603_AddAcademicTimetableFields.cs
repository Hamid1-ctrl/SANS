using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SANS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAcademicTimetableFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AcademicLevel",
                table: "Schedules",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Building",
                table: "Schedules",
                type: "TEXT",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CourseCode",
                table: "Schedules",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CourseTitle",
                table: "Schedules",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "DayOfWeek",
                table: "Schedules",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsMaster",
                table: "Schedules",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "Schedules",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LectureType",
                table: "Schedules",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LecturerName",
                table: "Schedules",
                type: "TEXT",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Schedules",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Semester",
                table: "Schedules",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Schedules_DayOfWeek",
                table: "Schedules",
                column: "DayOfWeek");

            migrationBuilder.CreateIndex(
                name: "IX_Schedules_IsMaster",
                table: "Schedules",
                column: "IsMaster");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Schedules_DayOfWeek",
                table: "Schedules");

            migrationBuilder.DropIndex(
                name: "IX_Schedules_IsMaster",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "AcademicLevel",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "Building",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "CourseCode",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "CourseTitle",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "DayOfWeek",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "IsMaster",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "LectureType",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "LecturerName",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "Semester",
                table: "Schedules");
        }
    }
}
