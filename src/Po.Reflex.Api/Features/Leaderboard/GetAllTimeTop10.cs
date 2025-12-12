using MediatR;
using Po.Reflex.Api.Infrastructure.TableStorage;
using Po.Reflex.Shared.DTOs;

namespace Po.Reflex.Api.Features.Leaderboard;

/// <summary>
/// MediatR handler for retrieving all-time top 10 entries (FR-021, FR-023).
/// Uses partition key: AllTime
/// </summary>
public static class GetAllTimeTop10
{
    public record Query(int Top = 10) : IRequest<LeaderboardResponse>;

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
                var entries = await _repository.GetAllTimeEntriesAsync(request.Top, cancellationToken);

                var dtoEntries = entries.Select((e, index) => new LeaderboardEntryDto(
                    Rank: index + 1,
                    Nickname: e.Nickname,
                    AverageMs: e.AverageReactionMs,
                    Timestamp: e.SubmittedAt.DateTime
                )).ToList();

                _logger.LogDebug("Retrieved {Count} all-time leaderboard entries", dtoEntries.Count);

                return new LeaderboardResponse("AllTime", dtoEntries, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve all-time leaderboard");
                return new LeaderboardResponse("AllTime", new List<LeaderboardEntryDto>(), null);
            }
        }
    }
}
