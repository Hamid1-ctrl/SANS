using System;
using System.Text.Json;
var opts = new JsonSerializerOptions(JsonSerializerDefaults.Web);
var json = "{\"title\":\"HW\",\"description\":\"d\",\"instructions\":\"i\",\"dueDate\":\"2026-08-15\",\"classWorkspaceId\":\"CB90D535-DA57-4186-967F-82D25301642E\",\"maxPoints\":100,\"allowLateSubmission\":true}";
try { var m = JsonSerializer.Deserialize<M>(json, opts); Console.WriteLine($"BIND OK due={m!.DueDate} cw={m.ClassWorkspaceId} max={m.MaxPoints} late={m.AllowLateSubmission}"); }
catch (Exception ex) { Console.WriteLine($"BIND FAIL {ex.GetType().Name}: {ex.Message}"); }
var json2 = "{\"title\":\"t\",\"dueDate\":\"2026-08-15\",\"classWorkspaceId\":\"not-a-guid\",\"maxPoints\":100}";
try { var m2 = JsonSerializer.Deserialize<M>(json2, opts); Console.WriteLine($"BADGUID OK cw={m2!.ClassWorkspaceId}"); }
catch (Exception ex) { Console.WriteLine($"BADGUID FAIL {ex.GetType().Name}: {ex.Message}"); }
public class M {
  public string Title { get; set; } = "";
  public string Description { get; set; } = "";
  public DateTime DueDate { get; set; }
  public int MaxPoints { get; set; }
  public bool AllowLateSubmission { get; set; }
  public Guid? ClassWorkspaceId { get; set; }
  public Guid? DepartmentId { get; set; }
  public string? AttachmentUrl { get; set; }
  public long? AttachmentFileSize { get; set; }
  public int? LateSubmissionPenalty { get; set; }
}
