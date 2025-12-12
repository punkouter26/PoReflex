using System.Diagnostics.Metrics;

namespace Po.Reflex.Api.Infrastructure.Metrics;

/// <summary>
/// OpenTelemetry metrics for game operations.
/// Tracks games started, completed, failed, and reaction times.
/// </summary>
public sealed class GameMetrics : IDisposable
{
    public const string MeterName = "Po.Reflex.Game";

    private readonly Meter _meter;
    private readonly Counter<long> _gamesStarted;
    private readonly Counter<long> _gamesCompleted;
    private readonly Counter<long> _gamesFailed;
    private readonly Histogram<double> _reactionTime;
    private readonly Counter<long> _scoresSubmitted;
    private readonly Counter<long> _scoresRejected;

    public GameMetrics(IMeterFactory meterFactory)
    {
        _meter = meterFactory.Create(MeterName);

        _gamesStarted = _meter.CreateCounter<long>(
            name: "poreflex.games.started",
            unit: "{games}",
            description: "Number of games started");

        _gamesCompleted = _meter.CreateCounter<long>(
            name: "poreflex.games.completed",
            unit: "{games}",
            description: "Number of games completed successfully");

        _gamesFailed = _meter.CreateCounter<long>(
            name: "poreflex.games.failed",
            unit: "{games}",
            description: "Number of games failed (false start, timeout, inhuman speed)");

        _reactionTime = _meter.CreateHistogram<double>(
            name: "poreflex.reaction_time",
            unit: "ms",
            description: "Reaction time in milliseconds");

        _scoresSubmitted = _meter.CreateCounter<long>(
            name: "poreflex.scores.submitted",
            unit: "{scores}",
            description: "Number of scores successfully submitted to leaderboard");

        _scoresRejected = _meter.CreateCounter<long>(
            name: "poreflex.scores.rejected",
            unit: "{scores}",
            description: "Number of scores rejected due to validation failures");
    }

    /// <summary>
    /// Records a game start event.
    /// </summary>
    public void RecordGameStarted(string? deviceFingerprint = null)
    {
        _gamesStarted.Add(1,
            new KeyValuePair<string, object?>("device.fingerprint", deviceFingerprint ?? "unknown"));
    }

    /// <summary>
    /// Records a successful game completion with reaction times.
    /// </summary>
    public void RecordGameCompleted(double averageMs, IReadOnlyList<double> reactionTimes)
    {
        _gamesCompleted.Add(1);

        // Record the average reaction time
        _reactionTime.Record(averageMs,
            new KeyValuePair<string, object?>("type", "average"));

        // Record individual reaction times for distribution analysis
        foreach (var time in reactionTimes)
        {
            _reactionTime.Record(time,
                new KeyValuePair<string, object?>("type", "individual"));
        }
    }

    /// <summary>
    /// Records a game failure with the reason.
    /// </summary>
    public void RecordGameFailed(FailureReason reason)
    {
        _gamesFailed.Add(1,
            new KeyValuePair<string, object?>("reason", reason.ToString()));
    }

    /// <summary>
    /// Records a successful score submission.
    /// </summary>
    public void RecordScoreSubmitted(int rank)
    {
        _scoresSubmitted.Add(1,
            new KeyValuePair<string, object?>("rank.bucket", GetRankBucket(rank)));
    }

    /// <summary>
    /// Records a rejected score submission.
    /// </summary>
    public void RecordScoreRejected(string reason)
    {
        _scoresRejected.Add(1,
            new KeyValuePair<string, object?>("reason", reason));
    }

    private static string GetRankBucket(int rank)
    {
        return rank switch
        {
            1 => "1st",
            <= 3 => "top3",
            <= 10 => "top10",
            <= 50 => "top50",
            <= 100 => "top100",
            _ => "below100"
        };
    }

    public void Dispose()
    {
        _meter.Dispose();
    }
}

/// <summary>
/// Reasons why a game might fail.
/// </summary>
public enum FailureReason
{
    FalseStart,
    Timeout,
    InhumanSpeed,
    AppBackgrounded,
    ValidationError
}
