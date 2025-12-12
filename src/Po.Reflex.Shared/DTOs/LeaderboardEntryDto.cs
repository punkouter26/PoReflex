namespace Po.Reflex.Shared.DTOs;

/// <summary>
/// DTO for a single leaderboard entry.
/// </summary>
/// <param name="Rank">Position on the leaderboard (1-10).</param>
/// <param name="Nickname">Player's nickname.</param>
/// <param name="AverageMs">Average reaction time in milliseconds.</param>
/// <param name="Timestamp">When the score was achieved.</param>
public record LeaderboardEntryDto(
    int Rank,
    string Nickname,
    double AverageMs,
    DateTime Timestamp
);
