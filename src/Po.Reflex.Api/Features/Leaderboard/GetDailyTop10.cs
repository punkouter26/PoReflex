using MediatR;
using Po.Reflex.Api.Infrastructure.TableStorage;
using Po.Reflex.Shared.DTOs;

namespace Po.Reflex.Api.Features.Leaderboard;

/// <summary>
/// MediatR handler for retrieving daily top 10 entries (FR-021, FR-022).
/// Uses partition key format: Daily-YYYY-MM-DD
/// </summary>
public static class GetDailyTop10
{
    public record Query(DateOnly? Date = null) : IRequest<LeaderboardResponse>;

    public class Handler : IRequestHandler<Query, LeaderboardResponse>
    {
        private readonly ILeaderboardRepository _repository;
        private readonly ILogger<Handler> _logger;

        public Handler(ILeaderboardRepository repository, ILogger<Handler> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<LeaderboardResponse> Handle(Query request, CancellationToken cancellationToken)
        {
            try
            {
                var date = request.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);
                var entries = await _repository.GetDailyEntriesAsync(date, 10, cancellationToken);

                var dtoEntries = entries.Select((e, index) => new LeaderboardEntryDto(
                    Rank: index + 1,
                    Nickname: e.Nickname,
                    AverageMs: e.AverageReactionMs,
                    Timestamp: e.SubmittedAt.DateTime
                )).ToList();

                _logger.LogDebug("Retrieved {Count} daily leaderboard entries for {Date}", dtoEntries.Count, date);

                return new LeaderboardResponse("Daily", dtoEntries, date.ToDateTime(TimeOnly.MinValue));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve daily leaderboard");
                return new LeaderboardResponse("Daily", new List<LeaderboardEntryDto>(), DateTime.UtcNow.Date);
            }
        }
    }
}
