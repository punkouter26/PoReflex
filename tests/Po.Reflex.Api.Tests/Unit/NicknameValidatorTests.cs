using FluentAssertions;
using FluentValidation.TestHelper;
using Po.Reflex.Shared.Validation;
using Xunit;

namespace Po.Reflex.Api.Tests.Unit;

/// <summary>
/// Unit tests for NicknameValidator (T060, FR-015).
/// </summary>
public class NicknameValidatorTests
{
    private readonly NicknameValidator _validator;

    public NicknameValidatorTests()
    {
        _validator = new NicknameValidator();
    }

    [Theory]
    [InlineData("Player")]
    [InlineData("abc")]
    [InlineData("Test123")]
    [InlineData("Player_One")]
    [InlineData("abcdefghijklmnopqrst")] // 20 chars - max
    public void Validate_ValidNickname_ReturnsNoErrors(string nickname)
    {
        // Act
        var result = _validator.TestValidate(nickname);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_EmptyNickname_ReturnsError()
    {
        // Act
        var result = _validator.TestValidate("");

        // Assert
        result.ShouldHaveValidationErrorFor(x => x);
    }

    [Fact]
    public void Validate_NullNickname_ReturnsError()
    {
        // Act
        var result = _validator.TestValidate((string)null!);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x);
    }

    [Theory]
    [InlineData("ab")] // 2 chars - too short
    [InlineData("a")] // 1 char - too short
    public void Validate_TooShort_ReturnsError(string nickname)
    {
        // Act
        var result = _validator.TestValidate(nickname);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x)
            .WithErrorMessage("Nickname must be at least 3 characters");
    }

    [Fact]
    public void Validate_TooLong_ReturnsError()
    {
        // Arrange: 21 characters
        var nickname = "abcdefghijklmnopqrstu";

        // Act
        var result = _validator.TestValidate(nickname);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x)
            .WithErrorMessage("Nickname must be at most 20 characters");
    }

    [Theory]
    [InlineData("Player@Name")]
    [InlineData("Hello World")]
    [InlineData("Test!User")]
    [InlineData("User#123")]
    [InlineData("Name$")]
    [InlineData("Test%ing")]
    [InlineData("User-Name")] // Hyphen not allowed
    [InlineData("Test.User")] // Dot not allowed
    public void Validate_SpecialCharacters_ReturnsError(string nickname)
    {
        // Act
        var result = _validator.TestValidate(nickname);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x)
            .WithErrorMessage("Nickname can only contain letters, numbers, and underscores");
    }

    [Fact]
    public void Validate_OnlyNumbers_IsValid()
    {
        // Act
        var result = _validator.TestValidate("123456");

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_OnlyUnderscores_IsValid()
    {
        // Arrange
        var nickname = "___";

        // Act
        var result = _validator.TestValidate(nickname);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("Player1")]
    [InlineData("test_user")]
    [InlineData("ABC_123")]
    public void Validate_MixedValidCharacters_ReturnsNoErrors(string nickname)
    {
        // Act
        var result = _validator.TestValidate(nickname);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }
}
