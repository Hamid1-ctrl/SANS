using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SANS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateUserPasswordHashes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "PasswordHash",
                value: "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "PasswordHash",
                value: "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "PasswordHash",
                value: "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "PasswordHash",
                value: "XohImNooBHFR0ESv6PhydmL9U/0fJ+IsvW9EBf9RRe8=");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "PasswordHash",
                value: "XohImNooBHFR0ESv6PhydmL9U/0fJ+IsvW9EBf9RRe8=");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "PasswordHash",
                value: "XohImNooBHFR0ESv6PhydmL9U/0fJ+IsvW9EBf9RRe8=");
        }
    }
}
