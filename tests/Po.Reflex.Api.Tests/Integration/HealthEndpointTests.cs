using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Po.Reflex.Shared.DTOs;
using Xunit;

namespace Po.Reflex.Api.Tests.Integration;

/// <summary>
/// Integration tests for the /api/health endpoint.
/// </summary>
public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
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
}
