using FluentValidation;

namespace Po.Reflex.Shared.Validation;

/// <summary>
/// Validator for player nicknames.
/// Implements FR-014, FR-015: Nicknames must be 3-20 characters (letters, numbers, underscore).
/// </summary>
public class NicknameValidator : AbstractValidator<string>
{
    public const int MinLength = 3;
    public const int MaxLength = 20;
    public const string AllowedPattern = @"^[A-Za-z0-9_]+$";

    public NicknameValidator()
    {
        RuleFor(x => x)
            .NotEmpty()
            .WithMessage("Nickname is required")
            .MinimumLength(MinLength)
            .WithMessage($"Nickname must be at least {MinLength} characters")
            .MaximumLength(MaxLength)
            .WithMessage($"Nickname must be at most {MaxLength} characters")
            .Matches(AllowedPattern)
            .WithMessage("Nickname can only contain letters, numbers, and underscores");
    }
}
