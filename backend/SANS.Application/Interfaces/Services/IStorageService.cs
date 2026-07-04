namespace SANS.Application.Interfaces.Services;

public interface IStorageService
{
    Task<string> UploadFileAsync(string fileName, Stream fileStream, string folder = "uploads");
    Task<string> UploadFileAsync(byte[] fileBytes, string fileName, string folder = "uploads");
    Task DeleteFileAsync(string fileUrl);
    Task<string> GetFileUrlAsync(string fileName, string folder = "uploads");
}
