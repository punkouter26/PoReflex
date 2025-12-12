namespace Po.Reflex.Shared.DTOs;

/// <summary>
/// Request DTO for submitting a game score.
/// </summary>
/// <param name="Nickname">Player's nickname (1-15 letters).</param>
/// <param name="AverageMs">Average reaction time in milliseconds.</param>
/// <param name="ReactionTimes">Array of 6 individual reaction times.</param>
/// <param name="DeviceFingerprint">Browser/device fingerprint for rate limiting.</param>
public record ScoreSubmissionRequest(
    string Nickname,
    double AverageMs,
    double[] ReactionTimes,
    string? DeviceFingerprint = null
);
