namespace Po.Reflex.Shared.DTOs;

/// <summary>
/// Health check response DTO.
/// </summary>
/// <param name="IsHealthy">Overall health status.</param>
/// <param name="StorageConnected">Whether Azure Table Storage is connected.</param>
/// <param name="ErrorMessage">Error message if unhealthy.</param>
public record HealthStatusDto(
    bool IsHealthy,
    bool StorageConnected,
    string? ErrorMessage
);
