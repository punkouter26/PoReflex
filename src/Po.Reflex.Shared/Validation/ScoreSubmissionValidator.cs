using FluentValidation;
using Po.Reflex.Shared.DTOs;

namespace Po.Reflex.Shared.Validation;

/// <summary>
/// Validator for score submission requests (FR-010, FR-018, FR-019).
/// </summary>
public class ScoreSubmissionValidator : AbstractValidator<ScoreSubmissionRequest>
{
    /// <summary>
    /// Minimum acceptable reaction time in milliseconds.
    /// Times below this are considered inhuman/cheating.
    /// </summary>
    public const double MinimumReactionTimeMs = 100.0;

    public ScoreSubmissionValidator()
    {
        RuleFor(x => x.Nickname)
            .NotEmpty().WithMessage("Nickname is required")
            .MinimumLength(3).WithMessage("Nickname must be at least 3 characters")
            .MaximumLength(20).WithMessage("Nickname must be at most 20 characters")
            .Matches(@"^[A-Za-z0-9_]+$").WithMessage("Nickname can only contain letters, numbers, and underscores");

        RuleFor(x => x.AverageMs)
            .GreaterThan(0).WithMessage("Average reaction time must be positive")
            .LessThan(10000).WithMessage("Average reaction time must be less than 10 seconds");

        RuleFor(x => x.ReactionTimes)
            .NotEmpty().WithMessage("Reaction times are required")
            .Must(t => t != null && t.Length == 6).WithMessage("Exactly 6 reaction times are required");

        RuleForEach(x => x.ReactionTimes)
            .GreaterThanOrEqualTo(MinimumReactionTimeMs)
                .WithMessage($"Reaction times below {MinimumReactionTimeMs}ms are not allowed (inhuman speed detected)")
            .LessThan(10000).WithMessage("Each reaction time must be less than 10 seconds");
    }
}
