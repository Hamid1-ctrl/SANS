using Microsoft.EntityFrameworkCore;
using SANS.Infrastructure.Data;

namespace SANS.WebAPI.Services;

public class ExpiredItemsCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ExpiredItemsCleanupService> _logger;

    public ExpiredItemsCleanupService(IServiceProvider serviceProvider, ILogger<ExpiredItemsCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpiredItemsCleanupService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PerformCleanupAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogError(ex, "Error occurred during expired items cleanup.");
                }
                catch
                {
                    // Ignore logger disposal errors on shutdown
                }
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    public async Task PerformCleanupAsync(CancellationToken cancellationToken = default)
    {
        if (cancellationToken.IsCancellationRequested) return;

        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;

        // 1. Cleanup expired Quizzes (where Date < now)
        var expiredQuizzes = await context.Quizzes
            .Where(q => !q.IsDeleted && q.Date < now)
            .ToListAsync(cancellationToken);

        if (expiredQuizzes.Count > 0)
        {
            foreach (var quiz in expiredQuizzes)
            {
                quiz.IsDeleted = true;
                quiz.DeletedAt = now;
                quiz.UpdatedBy = "System Expired Cleanup";
            }
            _logger.LogInformation("Auto-deleted {Count} expired quizzes.", expiredQuizzes.Count);
        }

        // 2. Cleanup expired Assignments (where DueDate < now)
        var expiredAssignments = await context.Assignments
            .Where(a => !a.IsDeleted && a.DueDate < now)
            .ToListAsync();

        if (expiredAssignments.Count > 0)
        {
            foreach (var assignment in expiredAssignments)
            {
                assignment.IsDeleted = true;
                assignment.DeletedAt = now;
                assignment.UpdatedBy = "System Expired Cleanup";
            }
            _logger.LogInformation("Auto-deleted {Count} expired assignments.", expiredAssignments.Count);
        }

        if (expiredQuizzes.Count > 0 || expiredAssignments.Count > 0)
        {
            await context.SaveChangesAsync();
        }
    }
}
