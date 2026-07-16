using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using SANS.Application.Interfaces.Services;

namespace SANS.Infrastructure.Services;

public class R2StorageService : IStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly string _publicUrl;

    public R2StorageService(IConfiguration configuration)
    {
        var accessKey = configuration["CLOUDFLARE_R2_ACCESS_KEY_ID"] ?? "";
        var secretKey = configuration["CLOUDFLARE_R2_SECRET_ACCESS_KEY"] ?? "";
        var endpoint = configuration["CLOUDFLARE_R2_ENDPOINT"] ?? "";
        if (!string.IsNullOrEmpty(endpoint))
        {
            try
            {
                var uri = new Uri(endpoint);
                endpoint = $"{uri.Scheme}://{uri.Host}";
            }
            catch {}
        }
        
        _bucketName = configuration["CLOUDFLARE_R2_BUCKET_NAME"] ?? "";
        _publicUrl = configuration["CLOUDFLARE_R2_PUBLIC_URL"] ?? "";

        var s3Config = new AmazonS3Config
        {
            ServiceURL = endpoint,
            ForcePathStyle = true // Cloudflare R2 works best with path-style access
        };

        _s3Client = new AmazonS3Client(accessKey, secretKey, s3Config);
    }

    public async Task<string> UploadFileAsync(string fileName, Stream fileStream, string folder = "uploads")
    {
        var key = $"{folder}/{fileName}";
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = fileStream,
            DisablePayloadSigning = true // Required for Cloudflare R2 compatibility
        };

        var response = await _s3Client.PutObjectAsync(request);

        if (response.HttpStatusCode != System.Net.HttpStatusCode.OK)
        {
            throw new Exception($"Failed to upload file to Cloudflare R2. HttpStatusCode: {response.HttpStatusCode}");
        }

        var baseUrl = _publicUrl.EndsWith("/") ? _publicUrl : $"{_publicUrl}/";
        return $"{baseUrl}{key}";
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
            var key = ExtractKeyFromUrl(fileUrl);
            if (string.IsNullOrEmpty(key))
            {
                return;
            }

            var request = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = key
            };

            await _s3Client.DeleteObjectAsync(request);
        }
        catch (Exception ex)
        {
            throw new Exception($"Error deleting file from R2: {ex.Message}", ex);
        }
    }

    public Task<string> GetFileUrlAsync(string fileName, string folder = "uploads")
    {
        var baseUrl = _publicUrl.EndsWith("/") ? _publicUrl : $"{_publicUrl}/";
        return Task.FromResult($"{baseUrl}{folder}/{fileName}");
    }

    private string? ExtractKeyFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var publicUri = new Uri(_publicUrl);
            var path = uri.AbsolutePath;
            
            // Remove leading slash
            if (path.StartsWith("/"))
            {
                path = path.Substring(1);
            }
            return path;
        }
        catch
        {
            return null;
        }
    }
}
