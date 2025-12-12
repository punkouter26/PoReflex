using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Logging;
using Moq;
using Po.Reflex.Api.Features.Game;
using Po.Reflex.Api.Infrastructure.TableStorage;
using Po.Reflex.Shared.DTOs;
using Po.Reflex.Shared.Validation;
using Xunit;

namespace Po.Reflex.Api.Tests.Unit;

/// <summary>
/// Unit tests for SubmitScore handler (T027, T028).
/// </summary>
public class SubmitScoreHandlerTests
{
    private readonly Mock<ILeaderboardRepository> _mockRepository;
    private readonly Mock<ILogger<SubmitScore.Handler>> _mockLogger;
    private readonly IValidator<ScoreSubmissionRequest> _validator;
    private readonly SubmitScore.Handler _handler;

    public SubmitScoreHandlerTests()
    {
        _mockRepository = new Mock<ILeaderboardRepository>();
        _mockLogger = new Mock<ILogger<SubmitScore.Handler>>();
        _validator = new ScoreSubmissionValidator();
        _handler = new SubmitScore.Handler(
            _mockRepository.Object,
            _validator,
            _mockLogger.Object
        );
    }

    [Fact]
    public async Task Handle_ValidSubmission_ReturnsSuccessWithRank()
    {
        // Arrange
        var command = new SubmitScore.Command(
            Nickname: "TestPlayer",
            AverageMs: 245.67,
            ReactionTimes: [232.5, 248.3, 251.2, 240.8, 255.1, 246.1]
        );

        _mockRepository
            .Setup(r => r.AddEntryAsync(It.IsAny<LeaderboardEntry>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _mockRepository
            .Setup(r => r.GetRankAsync(It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(5);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Rank.Should().Be(5);
        result.ErrorMessage.Should().BeNull();

        _mockRepository.Verify(
            r => r.AddEntryAsync(It.Is<LeaderboardEntry>(e =>
                e.Nickname == "TestPlayer" &&
                Math.Abs(e.AverageReactionMs - 245.67) < 0.01),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData("", "Nickname is required")]
    [InlineData("ab", "Nickname must be at least 3 characters")]
    [InlineData("abcdefghijklmnopqrstuv", "Nickname must be at most 20 characters")]
    [InlineData("test@user", "Nickname can only contain letters, numbers, and underscores")]
    public async Task Handle_InvalidNickname_ReturnsError(string nickname, string expectedErrorFragment)
    {
        // Arrange
        var command = new SubmitScore.Command(
            Nickname: nickname,
            AverageMs: 245.67,
            ReactionTimes: [232.5, 248.3, 251.2, 240.8, 255.1, 246.1]
        );

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Contain(expectedErrorFragment);
    }

    [Fact]
    public async Task Handle_InvalidReactionTimesCount_ReturnsError()
    {
        // Arrange
        var command = new SubmitScore.Command(
            Nickname: "TestPlayer",
            AverageMs: 245.67,
            ReactionTimes: [232.5, 248.3] // Only 2 times, need 6
        );

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Contain("6 reaction times");
    }

    [Fact]
    public async Task Handle_NegativeReactionTime_ReturnsError()
    {
        // Arrange
        var command = new SubmitScore.Command(
            Nickname: "TestPlayer",
            AverageMs: 245.67,
            ReactionTimes: [-100, 248.3, 251.2, 240.8, 255.1, 246.1]
        );

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Contain("positive");
    }

    [Fact]
    public async Task Handle_RepositoryFailure_ReturnsError()
    {
        // Arrange
        var command = new SubmitScore.Command(
            Nickname: "TestPlayer",
            AverageMs: 245.67,
            ReactionTimes: [232.5, 248.3, 251.2, 240.8, 255.1, 246.1]
        );

        _mockRepository
            .Setup(r => r.AddEntryAsync(It.IsAny<LeaderboardEntry>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Connection failed"));

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Contain("Failed to save");
    }

    [Fact]
    public async Task Handle_SuspiciouslyFastTimes_StillSubmits()
    {
        // Arrange: Times < 100ms are suspicious but allowed
        var command = new SubmitScore.Command(
            Nickname: "FastPlayer",
            AverageMs: 75.0,
            ReactionTimes: [70, 72, 75, 78, 80, 75]
        );

        _mockRepository
            .Setup(r => r.AddEntryAsync(It.IsAny<LeaderboardEntry>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _mockRepository
            .Setup(r => r.GetRankAsync(It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert: Submission still succeeds (fraud detection is passive)
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_IncludesDeviceFingerprintAndIp()
    {
        // Arrange
        var command = new SubmitScore.Command(
            Nickname: "TestPlayer",
            AverageMs: 245.67,
            ReactionTimes: [232.5, 248.3, 251.2, 240.8, 255.1, 246.1],
            DeviceFingerprint: "abc123",
            IpAddress: "192.168.1.1"
        );

        _mockRepository
            .Setup(r => r.AddEntryAsync(It.IsAny<LeaderboardEntry>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _mockRepository
            .Setup(r => r.GetRankAsync(It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(5);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();

        _mockRepository.Verify(
            r => r.AddEntryAsync(It.Is<LeaderboardEntry>(e =>
                e.DeviceFingerprint == "abc123" &&
                e.IpAddress == "192.168.1.1"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
