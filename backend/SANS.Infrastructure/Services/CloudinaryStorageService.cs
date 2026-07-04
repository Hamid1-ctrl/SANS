using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using SANS.Application.Interfaces.Services;

namespace SANS.Infrastructure.Services;

public class CloudinaryStorageService : IStorageService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryStorageService(string cloudName, string apiKey, string apiSecret)
    {
        var account = new Account(cloudName, apiKey, apiSecret);
        _cloudinary = new Cloudinary(account);
    }

    public async Task<string> UploadFileAsync(string fileName, Stream fileStream, string folder = "uploads")
    {
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(fileName, fileStream),
            Folder = folder,
            UseFilename = true,
            UniqueFilename = false,
            Overwrite = true
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams);
        
        if (uploadResult.StatusCode != System.Net.HttpStatusCode.OK)
        {
            throw new Exception($"Failed to upload file: {uploadResult.Error?.Message}");
        }

        return uploadResult.SecureUrl.ToString();
    }

    public async Task<string> UploadFileAsync(byte[] fileBytes, string fileName, string folder = "uploads")
    {
        using var stream = new MemoryStream(fileBytes);
        return await UploadFileAsync(fileName, stream, folder);
    }

    public async Task DeleteFileAsync(string fileUrl)
    {
        try
        {
            var publicId = ExtractPublicIdFromUrl(fileUrl);
            if (string.IsNullOrEmpty(publicId))
            {
                return;
            }

            var deletionParams = new DeletionParams(publicId);
            var deletionResult = await _cloudinary.DestroyAsync(deletionParams);

            if (deletionResult.StatusCode != System.Net.HttpStatusCode.OK)
            {
                throw new Exception($"Failed to delete file: {deletionResult.Error?.Message}");
            }
        }
        catch (Exception ex)
        {
            throw new Exception($"Error deleting file: {ex.Message}", ex);
        }
    }

    public Task<string> GetFileUrlAsync(string fileName, string folder = "uploads")
    {
        var url = _cloudinary.Api.UrlImgUp.BuildUrl($"{folder}/{fileName}");
        return Task.FromResult(url);
    }

    private string? ExtractPublicIdFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var path = uri.AbsolutePath;
            var segments = path.Split('/');
            var fileNameWithExtension = segments.Last();
            var fileName = Path.GetFileNameWithoutExtension(fileNameWithExtension);
            var folder = string.Join("/", segments.Skip(1).Take(segments.Length - 2));
            return $"{folder}/{fileName}";
        }
        catch
        {
            return null;
        }
    }
}
