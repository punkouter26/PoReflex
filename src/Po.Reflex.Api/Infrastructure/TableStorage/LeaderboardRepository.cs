using Azure;
using Azure.Data.Tables;
using Po.Reflex.Api.Features.Game;

namespace Po.Reflex.Api.Infrastructure.TableStorage;

/// <summary>
/// Repository for leaderboard operations using Azure Table Storage.
/// </summary>
public interface ILeaderboardRepository
{
    /// <summary>
    /// Check if the storage connection is healthy.
    /// </summary>
    Task<bool> IsConnectedAsync();

    /// <summary>
    /// Add a new leaderboard entry.
    /// </summary>
    Task AddEntryAsync(LeaderboardEntry entry, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the rank for a given score.
    /// </summary>
    Task<int> GetRankAsync(double averageMs, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the top entries (default behavior).
    /// </summary>
    Task<List<LeaderboardEntry>> GetTopEntriesAsync(int top, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the top 10 entries for a specific day.
    /// </summary>
    Task<List<LeaderboardEntry>> GetDailyEntriesAsync(DateOnly date, int top, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the all-time top entries.
    /// </summary>
    Task<List<LeaderboardEntry>> GetAllTimeEntriesAsync(int top, CancellationToken cancellationToken = default);
}

/// <summary>
/// Azure Table Storage entity for leaderboard entries.
/// </summary>
public class LeaderboardTableEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty;
    public string RowKey { get; set; } = string.Empty;
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string Nickname { get; set; } = string.Empty;
    public double AverageMs { get; set; }
    public DateTime ScoreTimestamp { get; set; }
    public bool IsValid { get; set; } = true;
}

/// <summary>
/// Implementation of leaderboard repository using Azure Table Storage.
/// </summary>
public class LeaderboardRepository : ILeaderboardRepository
{
    private readonly TableClient _tableClient;
    private readonly ILogger<LeaderboardRepository> _logger;
    private const string TableName = "leaderboard";

    public LeaderboardRepository(IConfiguration configuration, ILogger<LeaderboardRepository> logger)
    {
        _logger = logger;
        var connectionString = configuration.GetConnectionString("TableStorage")
            ?? throw new InvalidOperationException("TableStorage connection string not configured");

        // #2 - Configurable retry policy for test environment performance
        var options = new TableClientOptions();
        var maxRetries = configuration.GetValue("Azure:Retry:MaxRetries", 4);
        options.Retry.MaxRetries = maxRetries;
        
        var delay = configuration.GetValue<TimeSpan?>("Azure:Retry:Delay", null);
        if (delay.HasValue)
        {
            options.Retry.Delay = delay.Value;
        }
        
        var maxDelay = configuration.GetValue<TimeSpan?>("Azure:Retry:MaxDelay", null);
        if (maxDelay.HasValue)
        {
            options.Retry.MaxDelay = maxDelay.Value;
        }

        var serviceClient = new TableServiceClient(connectionString, options);
        _tableClient = serviceClient.GetTableClient(TableName);
    }

    public async Task<bool> IsConnectedAsync()
    {
        try
        {
            await _tableClient.CreateIfNotExistsAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to Table Storage");
            return false;
        }
    }

    public async Task AddEntryAsync(LeaderboardEntry entry, CancellationToken cancellationToken = default)
    {
        await _tableClient.CreateIfNotExistsAsync(cancellationToken);

        var timestamp = entry.SubmittedAt.UtcDateTime;
        var dailyPartition = GetDailyPartitionKey(timestamp);
        var rowKey = GenerateRowKey(entry.AverageReactionMs, timestamp);

        // Create daily entry
        var dailyEntity = new LeaderboardTableEntity
        {
            PartitionKey = dailyPartition,
            RowKey = rowKey,
            Nickname = entry.Nickname,
            AverageMs = entry.AverageReactionMs,
            ScoreTimestamp = timestamp,
            IsValid = true
        };

        // Create all-time entry
        var allTimeEntity = new LeaderboardTableEntity
        {
            PartitionKey = "AllTime",
            RowKey = rowKey,
            Nickname = entry.Nickname,
            AverageMs = entry.AverageReactionMs,
            ScoreTimestamp = timestamp,
            IsValid = true
        };

        await _tableClient.UpsertEntityAsync(dailyEntity, cancellationToken: cancellationToken);
        await _tableClient.UpsertEntityAsync(allTimeEntity, cancellationToken: cancellationToken);

        _logger.LogInformation("Added leaderboard entry: {Nickname} with {AverageMs}ms",
            entry.Nickname, entry.AverageReactionMs);
    }

    public async Task<int> GetRankAsync(double averageMs, CancellationToken cancellationToken = default)
    {
        await _tableClient.CreateIfNotExistsAsync(cancellationToken);

        var rowKey = GenerateRowKey(averageMs, DateTime.UtcNow);
        var rank = 1;

        await foreach (var entity in _tableClient.QueryAsync<LeaderboardTableEntity>(
            filter: "PartitionKey eq 'AllTime'",
            cancellationToken: cancellationToken))
        {
            if (string.Compare(entity.RowKey, rowKey, StringComparison.Ordinal) < 0)
            {
                rank++;
            }
        }

        return rank;
    }

    public async Task<List<LeaderboardEntry>> GetTopEntriesAsync(int top, CancellationToken cancellationToken = default)
    {
        return await GetAllTimeEntriesAsync(top, cancellationToken);
    }

    public async Task<List<LeaderboardEntry>> GetDailyEntriesAsync(DateOnly date, int top, CancellationToken cancellationToken = default)
    {
        var partitionKey = GetDailyPartitionKey(date.ToDateTime(TimeOnly.MinValue));
        return await GetEntriesAsync(partitionKey, top, cancellationToken);
    }

    public async Task<List<LeaderboardEntry>> GetAllTimeEntriesAsync(int top, CancellationToken cancellationToken = default)
    {
        return await GetEntriesAsync("AllTime", top, cancellationToken);
    }

    private async Task<List<LeaderboardEntry>> GetEntriesAsync(string partitionKey, int top, CancellationToken cancellationToken)
    {
        await _tableClient.CreateIfNotExistsAsync(cancellationToken);

        var results = new List<LeaderboardEntry>();

        await foreach (var entity in _tableClient.QueryAsync<LeaderboardTableEntity>(
            filter: $"PartitionKey eq '{partitionKey}'",
            maxPerPage: top,
            cancellationToken: cancellationToken))
        {
            results.Add(new LeaderboardEntry
            {
                Nickname = entity.Nickname,
                AverageReactionMs = entity.AverageMs,
                SubmittedAt = entity.ScoreTimestamp
            });

            if (results.Count >= top) break;
        }

        // Results are already sorted by RowKey (inverted score + timestamp)
        return results;
    }

    /// <summary>
    /// Generate partition key for daily leaderboard.
    /// Format: Daily-YYYY-MM-DD
    /// </summary>
    private static string GetDailyPartitionKey(DateTime date)
    {
        return $"Daily-{date:yyyy-MM-dd}";
    }

    /// <summary>
    /// Generate RowKey that sorts by fastest time, with ties broken by earliest timestamp.
    /// Format: {InvertedScore:D13}_{Timestamp.Ticks:D19}
    /// </summary>
    public static string GenerateRowKey(double averageMs, DateTime timestamp)
    {
        // Invert score so faster times sort first (lexicographically)
        // Scale to avoid floating point issues: multiply by 10000 for 0.05ms precision
        var invertedScore = 10000000000L - (long)(averageMs * 10000);
        return $"{invertedScore:D13}_{timestamp.Ticks:D19}";
    }
}
