using MediatR;
using Po.Reflex.Api.Infrastructure.TableStorage;
using Po.Reflex.Shared.DTOs;

namespace Po.Reflex.Api.Features.Leaderboard;

/// <summary>
/// MediatR handler for retrieving leaderboard entries (FR-021, FR-022, FR-023).
/// </summary>
public static class GetLeaderboard
{
    public record Query(int Top = 100, string? Nickname = null) : IRequest<LeaderboardResponse>;

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
                var entries = await _repository.GetTopEntriesAsync(request.Top, cancellationToken);

                var dtoEntries = entries.Select((e, index) => new LeaderboardEntryDto(
                    Rank: index + 1,
                    Nickname: e.Nickname,
                    AverageMs: e.AverageReactionMs,
                    Timestamp: e.SubmittedAt.DateTime
                )).ToList();

                _logger.LogDebug("Retrieved {Count} leaderboard entries", dtoEntries.Count);

                return new LeaderboardResponse("AllTime", dtoEntries, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve leaderboard");
                return new LeaderboardResponse("AllTime", new List<LeaderboardEntryDto>(), null);
            }
        }
    }
}
