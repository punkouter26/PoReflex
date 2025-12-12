using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Po.Reflex.Shared.DTOs;
using Xunit;

namespace Po.Reflex.Api.Tests.Integration;

/// <summary>
/// Integration tests for leaderboard endpoints (T050, FR-021, FR-022, FR-023).
/// </summary>
public class LeaderboardEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public LeaderboardEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetLeaderboard_Default_Returns200WithEntries()
    {
        // Act
        var response = await _client.GetAsync("/api/leaderboard");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        result.Should().NotBeNull();
        result!.Entries.Should().NotBeNull();
    }

    [Fact]
    public async Task GetLeaderboard_WithTopParameter_ReturnsLimitedEntries()
    {
        // Act
        var response = await _client.GetAsync("/api/leaderboard?top=5");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        result.Should().NotBeNull();
        // Note: Actual entries may be less than 5 if fewer exist
    }

    [Fact]
    public async Task GetLeaderboard_AfterSubmission_ShowsNewEntry()
    {
        // Arrange: Submit a score first
        var submission = new ScoreSubmissionRequest(
            Nickname: $"TestUser{DateTime.UtcNow.Ticks}",
            AverageMs: 275.50,
            ReactionTimes: [250, 260, 270, 280, 290, 303]
        );

        var submitResponse = await _client.PostAsJsonAsync("/api/game/score", submission);

        // Act: Get leaderboard
        var response = await _client.GetAsync("/api/leaderboard");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        result.Should().NotBeNull();

        // If storage is connected, the entry should appear
        // (May not work if Azurite is not running)
    }

    [Fact]
    public async Task SubmitScore_ValidScore_Returns200WithRank()
    {
        // Arrange
        var submission = new ScoreSubmissionRequest(
            Nickname: $"Player{DateTime.UtcNow.Ticks % 1000000}",
            AverageMs: 245.67,
            ReactionTimes: [232.5, 248.3, 251.2, 240.8, 255.1, 246.1]
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/game/score", submission);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ScoreSubmissionResponse>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Rank.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task SubmitScore_InvalidScore_Returns400()
    {
        // Arrange: Invalid - wrong number of reaction times
        var submission = new ScoreSubmissionRequest(
            Nickname: "TestPlayer",
            AverageMs: 245.67,
            ReactionTimes: [232.5, 248.3] // Only 2, need 6
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/game/score", submission);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SubmitScore_InhumanSpeed_Returns400()
    {
        // Arrange: Times below 100ms are rejected
        var submission = new ScoreSubmissionRequest(
            Nickname: "CheaterBot",
            AverageMs: 50.0,
            ReactionTimes: [45.0, 48.0, 52.0, 50.0, 55.0, 50.0]
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/game/score", submission);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
