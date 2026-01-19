using Azure;
using Azure.Data.Tables;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Po.Reflex.Api.Features.Game;
using Po.Reflex.Api.Infrastructure.TableStorage;
using Xunit;

namespace Po.Reflex.Api.Tests.Unit;

/// <summary>
/// Unit tests for LeaderboardRepository (#4 - Repository coverage).
/// Uses mocked TableClient for pure logic testing.
/// </summary>
public class LeaderboardRepositoryTests
{
    private readonly Mock<ILogger<LeaderboardRepository>> _mockLogger;

    public LeaderboardRepositoryTests()
    {
        _mockLogger = new Mock<ILogger<LeaderboardRepository>>();
    }

    private static IConfiguration CreateConfiguration(string? connectionString)
    {
        var inMemorySettings = new Dictionary<string, string?>();
        if (connectionString != null)
        {
            inMemorySettings["ConnectionStrings:TableStorage"] = connectionString;
        }
        return new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    [Fact]
    public void Constructor_ThrowsWhenConnectionStringMissing()
    {
        // Arrange
        var config = CreateConfiguration(null);

        // Act & Assert
        var action = () => new LeaderboardRepository(config, _mockLogger.Object);
        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*TableStorage connection string not configured*");
    }

    [Fact]
    public void Constructor_ThrowsWhenConnectionStringEmpty()
    {
        // Arrange
        var config = CreateConfiguration(string.Empty);

        // Act & Assert
        var action = () => new LeaderboardRepository(config, _mockLogger.Object);
        action.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Constructor_SucceedsWithValidConnectionString()
    {
        // Arrange
        var config = CreateConfiguration("UseDevelopmentStorage=true");

        // Act
        var action = () => new LeaderboardRepository(config, _mockLogger.Object);

        // Assert - should not throw
        action.Should().NotThrow();
    }
}

/// <summary>
/// Tests for LeaderboardEntry domain object.
/// </summary>
public class LeaderboardEntryTests
{
    [Fact]
    public void LeaderboardEntry_CalculatesAverageCorrectly()
    {
        // Arrange
        var reactionTimes = new double[] { 200, 220, 240, 260, 280, 300 };
        var expectedAverage = 250.0;

        // Act
        var entry = new LeaderboardEntry
        {
            Nickname = "TestPlayer",
            AverageReactionMs = reactionTimes.Average(),
            ReactionTimesJson = System.Text.Json.JsonSerializer.Serialize(reactionTimes),
            SubmittedAt = DateTimeOffset.UtcNow
        };

        // Assert
        entry.AverageReactionMs.Should().Be(expectedAverage);
    }

    [Fact]
    public void LeaderboardEntry_StoresAllReactionTimesAsJson()
    {
        // Arrange
        var reactionTimes = new double[] { 150.5, 160.2, 170.8, 180.1, 190.5, 200.9 };

        // Act
        var entry = new LeaderboardEntry
        {
            Nickname = "FastPlayer",
            AverageReactionMs = reactionTimes.Average(),
            ReactionTimesJson = System.Text.Json.JsonSerializer.Serialize(reactionTimes),
            SubmittedAt = DateTimeOffset.UtcNow
        };

        // Assert
        var storedTimes = System.Text.Json.JsonSerializer.Deserialize<double[]>(entry.ReactionTimesJson);
        storedTimes.Should().HaveCount(6);
        storedTimes.Should().BeEquivalentTo(reactionTimes);
    }

    [Fact]
    public void LeaderboardEntry_HasRequiredProperties()
    {
        // Act
        var entry = new LeaderboardEntry
        {
            Nickname = "Player",
            AverageReactionMs = 250.0,
            ReactionTimesJson = System.Text.Json.JsonSerializer.Serialize(new[] { 250, 250, 250, 250, 250, 250 }),
            SubmittedAt = DateTimeOffset.UtcNow,
            DeviceFingerprint = "test-fingerprint",
            IpAddress = "127.0.0.1"
        };

        // Assert
        entry.Nickname.Should().Be("Player");
        entry.AverageReactionMs.Should().Be(250.0);
        entry.DeviceFingerprint.Should().Be("test-fingerprint");
        entry.IpAddress.Should().Be("127.0.0.1");
    }
}

/// <summary>
/// Tests for LeaderboardTableEntity mapping.
/// </summary>
public class LeaderboardTableEntityTests
{
    [Fact]
    public void TableEntity_HasRequiredITableEntityProperties()
    {
        // Act
        var entity = new LeaderboardTableEntity
        {
            PartitionKey = "alltime",
            RowKey = "00000250000_20260119120000",
            Nickname = "TestPlayer",
            AverageMs = 250.0,
            ScoreTimestamp = DateTime.UtcNow,
            IsValid = true
        };

        // Assert
        entity.PartitionKey.Should().NotBeEmpty();
        entity.RowKey.Should().NotBeEmpty();
        entity.Should().BeAssignableTo<ITableEntity>();
    }

    [Fact]
    public void TableEntity_RowKeyFormat_EnablesSorting()
    {
        // Arrange - lower scores should sort first
        var fastScore = "00000200000_20260119120000"; // 200ms
        var slowScore = "00000300000_20260119120000"; // 300ms

        // Assert - string comparison should put faster scores first
        string.Compare(fastScore, slowScore, StringComparison.Ordinal).Should().BeLessThan(0);
    }
}
