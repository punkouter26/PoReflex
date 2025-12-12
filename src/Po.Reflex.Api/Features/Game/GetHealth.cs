using Po.Reflex.Api.Infrastructure.TableStorage;
using Po.Reflex.Shared.DTOs;

namespace Po.Reflex.Api.Features.Game;

/// <summary>
/// Health check endpoint for verifying API and storage connectivity.
/// Implements FR-032: System MUST verify leaderboard connectivity before allowing game start.
/// </summary>
public static class GetHealth
{
    /// <summary>
    /// Map the health check endpoint to the application.
    /// </summary>
    public static void MapHealthEndpoint(this WebApplication app)
    {
        app.MapGet("/api/health", HandleAsync)
            .WithName("GetHealth")
            .Produces<HealthStatusDto>(StatusCodes.Status200OK);
    }

    private static async Task<IResult> HandleAsync(ILeaderboardRepository repository, ILogger<Program> logger)
    {
        try
        {
            var isConnected = await repository.IsConnectedAsync();

            var status = new HealthStatusDto(
                IsHealthy: isConnected,
                StorageConnected: isConnected,
                ErrorMessage: isConnected ? null : "Storage connection failed"
            );

            logger.LogDebug("Health check completed: {IsHealthy}", status.IsHealthy);
            return Results.Ok(status);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Health check failed with exception");
            return Results.Ok(new HealthStatusDto(
                IsHealthy: false,
                StorageConnected: false,
                ErrorMessage: ex.Message
            ));
        }
    }
}
