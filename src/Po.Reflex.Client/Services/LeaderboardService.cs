using System.Net.Http.Json;
using Po.Reflex.Shared.DTOs;

namespace Po.Reflex.Client.Services;

/// <summary>
/// Service for leaderboard API calls (T056).
/// </summary>
public class LeaderboardService
{
    private readonly HttpClient _httpClient;

    public LeaderboardService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    /// <summary>
    /// Get all-time top 10 leaderboard entries.
    /// </summary>
    public async Task<LeaderboardResponse> GetAllTimeAsync(int top = 10)
    {
        try
        {
            var response = await _httpClient.GetFromJsonAsync<LeaderboardResponse>($"/api/leaderboard/alltime?top={top}");
            return response ?? new LeaderboardResponse("AllTime", new List<LeaderboardEntryDto>(), null);
        }
        catch
        {
            return new LeaderboardResponse("AllTime", new List<LeaderboardEntryDto>(), null);
        }
    }

    /// <summary>
    /// Get daily top 10 leaderboard entries.
    /// </summary>
    public async Task<LeaderboardResponse> GetDailyAsync(int top = 10)
    {
        try
        {
            var response = await _httpClient.GetFromJsonAsync<LeaderboardResponse>($"/api/leaderboard/daily?top={top}");
            return response ?? new LeaderboardResponse("Daily", new List<LeaderboardEntryDto>(), DateTime.UtcNow.Date);
        }
        catch
        {
            return new LeaderboardResponse("Daily", new List<LeaderboardEntryDto>(), DateTime.UtcNow.Date);
        }
    }

    /// <summary>
    /// Submit a game score and get the rank.
    /// </summary>
    public async Task<ScoreSubmissionResponse> SubmitScoreAsync(ScoreSubmissionRequest request)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("/api/game/score", request);

            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<ScoreSubmissionResponse>()
                    ?? new ScoreSubmissionResponse(false, ErrorMessage: "Unknown error");
            }

            var error = await response.Content.ReadAsStringAsync();
            return new ScoreSubmissionResponse(false, ErrorMessage: error);
        }
        catch (Exception ex)
        {
            return new ScoreSubmissionResponse(false, ErrorMessage: ex.Message);
        }
    }
}
