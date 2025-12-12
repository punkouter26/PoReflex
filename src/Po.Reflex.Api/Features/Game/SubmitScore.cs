using FluentValidation;
using MediatR;
using Po.Reflex.Api.Infrastructure.TableStorage;
using Po.Reflex.Shared.DTOs;
using Po.Reflex.Shared.Validation;

namespace Po.Reflex.Api.Features.Game;

/// <summary>
/// MediatR handler for submitting game scores (FR-018, FR-019).
/// </summary>
public static class SubmitScore
{
    public record Command(
        string Nickname,
        double AverageMs,
        double[] ReactionTimes,
        string? DeviceFingerprint = null,
        string? IpAddress = null
    ) : IRequest<Result>;

    public record Result(
        bool Success,
        int? Rank = null,
        string? ErrorMessage = null
    );

    public class Handler : IRequestHandler<Command, Result>
    {
        private readonly ILeaderboardRepository _repository;
        private readonly IValidator<ScoreSubmissionRequest> _validator;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ILeaderboardRepository repository,
            IValidator<ScoreSubmissionRequest> validator,
            ILogger<Handler> logger)
        {
            _repository = repository;
            _validator = validator;
            _logger = logger;
        }

        public async Task<Result> Handle(Command request, CancellationToken cancellationToken)
        {
            // Convert to DTO for validation
            var dto = new ScoreSubmissionRequest(
                Nickname: request.Nickname,
                AverageMs: request.AverageMs,
                ReactionTimes: request.ReactionTimes
            );

            // Validate the submission
            var validationResult = await _validator.ValidateAsync(dto, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = string.Join(", ", validationResult.Errors.Select(e => e.ErrorMessage));
                _logger.LogWarning("Score submission validation failed: {Errors}", errors);
                return new Result(false, ErrorMessage: errors);
            }

            // Validate reaction times are reasonable (fraud detection)
            if (request.ReactionTimes.Any(t => t < 100))
            {
                _logger.LogWarning(
                    "Suspicious reaction times detected for {Nickname}: {Times}",
                    request.Nickname,
                    string.Join(", ", request.ReactionTimes));

                // Still allow submission but flag it
                // In production, we might want to investigate further
            }

            try
            {
                // Submit to leaderboard
                var entry = new LeaderboardEntry
                {
                    Nickname = request.Nickname,
                    AverageReactionMs = request.AverageMs,
                    ReactionTimesJson = System.Text.Json.JsonSerializer.Serialize(request.ReactionTimes),
                    DeviceFingerprint = request.DeviceFingerprint,
                    IpAddress = request.IpAddress,
                    SubmittedAt = DateTimeOffset.UtcNow
                };

                await _repository.AddEntryAsync(entry, cancellationToken);

                // Get rank (position in leaderboard)
                var rank = await _repository.GetRankAsync(request.AverageMs, cancellationToken);

                _logger.LogInformation(
                    "Score submitted successfully: {Nickname} = {AverageMs}ms (Rank #{Rank})",
                    request.Nickname,
                    request.AverageMs,
                    rank);

                return new Result(true, Rank: rank);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to submit score for {Nickname}", request.Nickname);
                return new Result(false, ErrorMessage: "Failed to save score. Please try again.");
            }
        }
    }

    /// <summary>
    /// Validator for score submissions.
    /// </summary>
    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator()
        {
            RuleFor(x => x.Nickname)
                .NotEmpty().WithMessage("Nickname is required")
                .MaximumLength(20).WithMessage("Nickname must be at most 20 characters")
                .Matches(@"^[A-Za-z0-9_]+$").WithMessage("Nickname can only contain letters, numbers, and underscores");

            RuleFor(x => x.AverageMs)
                .GreaterThan(0).WithMessage("Average reaction time must be positive")
                .LessThan(10000).WithMessage("Average reaction time must be less than 10 seconds");

            RuleFor(x => x.ReactionTimes)
                .NotEmpty().WithMessage("Reaction times are required")
                .Must(t => t.Length == 6).WithMessage("Exactly 6 reaction times are required");

            RuleForEach(x => x.ReactionTimes)
                .GreaterThan(0).WithMessage("Each reaction time must be positive")
                .LessThan(10000).WithMessage("Each reaction time must be less than 10 seconds");
        }
    }
}

/// <summary>
/// Domain entity for leaderboard entries.
/// </summary>
public class LeaderboardEntry
{
    public string Nickname { get; set; } = "";
    public double AverageReactionMs { get; set; }
    public string ReactionTimesJson { get; set; } = "[]";
    public string? DeviceFingerprint { get; set; }
    public string? IpAddress { get; set; }
    public DateTimeOffset SubmittedAt { get; set; }
}
