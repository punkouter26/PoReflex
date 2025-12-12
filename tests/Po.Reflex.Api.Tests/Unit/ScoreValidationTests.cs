using FluentAssertions;
using FluentValidation.TestHelper;
using Po.Reflex.Shared.DTOs;
using Po.Reflex.Shared.Validation;
using Xunit;

namespace Po.Reflex.Api.Tests.Unit;

/// <summary>
/// Unit tests for inhuman speed detection and score validation (T041, FR-010).
/// </summary>
public class ScoreValidationTests
{
    private readonly ScoreSubmissionValidator _validator;

    public ScoreValidationTests()
    {
        _validator = new ScoreSubmissionValidator();
    }

    [Fact]
    public void Validate_ValidScore_ReturnsNoErrors()
    {
        // Arrange
        var request = new ScoreSubmissionRequest(
            Nickname: "TestPlayer",
            AverageMs: 245.67,
            ReactionTimes: [232.5, 248.3, 251.2, 240.8, 255.1, 246.1]
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_InhumanSpeed_UnderMinimum_ReturnsError()
    {
        // Arrange: Average < 100ms is considered inhuman (FR-010)
        var request = new ScoreSubmissionRequest(
            Nickname: "CheaterBot",
            AverageMs: 50.0, // Impossibly fast
            ReactionTimes: [45.0, 48.0, 52.0, 50.0, 55.0, 50.0]
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert: Individual times < 100ms are flagged
        result.ShouldHaveValidationErrorFor(x => x.ReactionTimes);
    }

    [Fact]
    public void Validate_AverageZero_ReturnsError()
    {
        // Arrange
        var request = new ScoreSubmissionRequest(
            Nickname: "TestPlayer",
            AverageMs: 0,
            ReactionTimes: [200, 200, 200, 200, 200, 200]
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.AverageMs);
    }

    [Fact]
    public void Validate_AverageNegative_ReturnsError()
    {
        // Arrange
        var request = new ScoreSubmissionRequest(
            Nickname: "TestPlayer",
            AverageMs: -100,
            ReactionTimes: [200, 200, 200, 200, 200, 200]
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.AverageMs);
    }

    [Fact]
    public void Validate_AverageTooHigh_ReturnsError()
    {
        // Arrange: Average > 10000ms (10s) indicates timeout abuse
        var request = new ScoreSubmissionRequest(
            Nickname: "SlowPlayer",
            AverageMs: 15000, // 15 seconds
            ReactionTimes: [14000, 15000, 16000, 14500, 15500, 15000]
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.AverageMs);
    }

    [Theory]
    [InlineData(5)] // Too few
    [InlineData(7)] // Too many
    [InlineData(0)] // Empty
    [InlineData(1)] // Single
    public void Validate_WrongNumberOfTimes_ReturnsError(int count)
    {
        // Arrange
        var times = Enumerable.Range(1, count).Select(_ => 200.0).ToArray();
        var request = new ScoreSubmissionRequest(
            Nickname: "TestPlayer",
            AverageMs: 200,
            ReactionTimes: times
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.ReactionTimes)
            .WithErrorMessage("Exactly 6 reaction times are required");
    }

    [Fact]
    public void Validate_NullReactionTimes_ReturnsError()
    {
        // Arrange
        var request = new ScoreSubmissionRequest(
            Nickname: "TestPlayer",
            AverageMs: 200,
            ReactionTimes: null!
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.ReactionTimes);
    }

    [Fact]
    public void Validate_NegativeReactionTime_ReturnsError()
    {
        // Arrange
        var request = new ScoreSubmissionRequest(
            Nickname: "TestPlayer",
            AverageMs: 200,
            ReactionTimes: [-50, 200, 200, 200, 200, 200]
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.ReactionTimes);
    }

    [Fact]
    public void Validate_EdgeCase_ExactlyMinimumAverage_IsValid()
    {
        // Arrange: 100ms average is borderline acceptable
        var request = new ScoreSubmissionRequest(
            Nickname: "QuickPlayer",
            AverageMs: 100.0,
            ReactionTimes: [100, 100, 100, 100, 100, 100]
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert: 100ms is valid (it's the minimum human reaction time threshold)
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_MismatchedAverageAndTimes_NoError()
    {
        // Arrange: Validator doesn't check if average matches times
        // (that's done server-side for fraud detection)
        var request = new ScoreSubmissionRequest(
            Nickname: "TestPlayer",
            AverageMs: 500.0, // Doesn't match actual average
            ReactionTimes: [200, 200, 200, 200, 200, 200]
        );

        // Act
        var result = _validator.TestValidate(request);

        // Assert: Validation passes, but server will recalculate
        result.ShouldNotHaveAnyValidationErrors();
    }
}
