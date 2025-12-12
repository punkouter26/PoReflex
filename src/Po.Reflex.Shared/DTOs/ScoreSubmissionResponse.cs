namespace Po.Reflex.Shared.DTOs;

/// <summary>
/// Response DTO after submitting a game score.
/// </summary>
/// <param name="Success">Whether the submission was successful.</param>
/// <param name="Rank">Player's rank (null if not ranked or failed).</param>
/// <param name="ErrorMessage">Error message if submission failed.</param>
public record ScoreSubmissionResponse(
    bool Success,
    int? Rank = null,
    string? ErrorMessage = null
);
