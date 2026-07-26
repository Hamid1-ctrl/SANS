using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SANS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixScheduleFileColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FileName",
                table: "Schedules",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "FileSize",
                table: "Schedules",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileType",
                table: "Schedules",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileUrl",
                table: "Schedules",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FileName",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "FileSize",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "FileType",
                table: "Schedules");

            migrationBuilder.DropColumn(
                name: "FileUrl",
                table: "Schedules");
        }
    }
}
