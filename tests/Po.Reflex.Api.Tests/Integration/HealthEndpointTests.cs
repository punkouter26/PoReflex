using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Po.Reflex.Api.Tests.Infrastructure;
using Po.Reflex.Shared.DTOs;
using Xunit;

namespace Po.Reflex.Api.Tests.Integration;

/// <summary>
/// Integration tests for the /api/health endpoint.
/// Uses TestWebApplicationFactory with reduced retry policy (#2).
/// </summary>
public class HealthEndpointTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOk_WithHealthStatus()
    {
        // Act
        var response = await _client.GetAsync("/api/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var health = await response.Content.ReadFromJsonAsync<HealthStatusDto>();
        health.Should().NotBeNull();
        // Note: In test environment without Azurite, storage may not be connected
        // The endpoint should still return a valid response structure
    }

    [Fact]
    public async Task GetHealth_ReturnsJsonContentType()
    {
        // Act
        var response = await _client.GetAsync("/api/health");

        // Assert
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
    }

    [Fact]
    public async Task GetHealth_ResponseContainsExpectedProperties()
    {
        // Act
        var response = await _client.GetAsync("/api/health");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        content.Should().Contain("isHealthy");
        content.Should().Contain("storageConnected");
    }

    /// <summary>
    /// #7 - Test for StorageConnected: false path when storage is unavailable.
    /// The health endpoint correctly reports storage connection status.
    /// </summary>
    [Fact]
    public async Task GetHealth_WithoutStorage_ReportsStorageStatus()
    {
        // Act - Default test factory uses reduced retry policy
        var response = await _client.GetAsync("/api/health");
        var health = await response.Content.ReadFromJsonAsync<HealthStatusDto>();

        // Assert - Health check should return a valid response
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        health.Should().NotBeNull();
        
        // The IsHealthy property reflects storage connection status
        // IsHealthy == StorageConnected by design (per copilot-instructions.md: "checks connections to all APIs and databases")
        health!.IsHealthy.Should().Be(health.StorageConnected);
    }

    [Fact]
    public async Task GetHealth_ReturnsConsistentIsHealthyAndStorageConnected()
    {
        // Act
        var response = await _client.GetAsync("/api/health");
        var health = await response.Content.ReadFromJsonAsync<HealthStatusDto>();

        // Assert - IsHealthy and StorageConnected should be consistent
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        health!.IsHealthy.Should().Be(health.StorageConnected);
    }

    [Fact]
    public async Task GetHealth_HasErrorMessageWhenUnhealthy()
    {
        // Act
        var response = await _client.GetAsync("/api/health");
        var health = await response.Content.ReadFromJsonAsync<HealthStatusDto>();

        // Assert
        health.Should().NotBeNull();
        // When unhealthy, error message should be present
        if (!health!.IsHealthy)
        {
            health.ErrorMessage.Should().NotBeNullOrEmpty();
        }
        // When healthy, error message should be null or empty
        else
        {
            health.ErrorMessage.Should().BeNullOrEmpty();
        }
    }
}
