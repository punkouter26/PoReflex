namespace Po.Reflex.Shared.DTOs;

/// <summary>
/// Response DTO for leaderboard queries.
/// </summary>
/// <param name="ViewType">Type of leaderboard view ("Daily" or "AllTime").</param>
/// <param name="Entries">List of top 10 leaderboard entries.</param>
/// <param name="AsOf">For daily view, the date of the leaderboard.</param>
public record LeaderboardResponse(
    string ViewType,
    List<LeaderboardEntryDto> Entries,
    DateTime? AsOf
);
