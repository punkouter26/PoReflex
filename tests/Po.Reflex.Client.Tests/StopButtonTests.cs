using Bunit;
using FluentAssertions;
using Microsoft.AspNetCore.Components;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.JSInterop;
using Moq;
using Po.Reflex.Client.Components;
using Xunit;

namespace Po.Reflex.Client.Tests;

/// <summary>
/// bUnit tests for StopButton component (T027, T027b).
/// </summary>
public class StopButtonTests : BunitContext
{
    [Fact]
    public void StopButton_Renders_WithCorrectText()
    {
        // Arrange & Act
        var cut = Render<StopButton>();

        // Assert
        cut.Find(".stop-button").Should().NotBeNull();
        cut.Find(".stop-text").TextContent.Should().Be("STOP");
    }

    [Fact]
    public void StopButton_WhenEnabled_InvokesCallback()
    {
        // Arrange
        var callbackInvoked = false;
        var cut = Render<StopButton>(parameters => parameters
            .Add(p => p.OnStop, EventCallback.Factory.Create(this, () => callbackInvoked = true))
            .Add(p => p.Disabled, false));

        // Act
        cut.Find(".stop-button").Click();

        // Assert
        callbackInvoked.Should().BeTrue();
    }

    [Fact]
    public void StopButton_WhenDisabled_DoesNotInvokeCallback()
    {
        // Arrange
        var callbackInvoked = false;
        var cut = Render<StopButton>(parameters => parameters
            .Add(p => p.OnStop, EventCallback.Factory.Create(this, () => callbackInvoked = true))
            .Add(p => p.Disabled, true));

        // Act
        cut.Find(".stop-button").Click();

        // Assert
        callbackInvoked.Should().BeFalse();
    }

    [Fact]
    public void StopButton_WhenDisabled_HasDisabledClass()
    {
        // Arrange & Act
        var cut = Render<StopButton>(parameters => parameters
            .Add(p => p.Disabled, true));

        // Assert
        cut.Find(".stop-button").ClassList.Should().Contain("disabled");
    }

    [Fact]
    public void StopButton_WhenEnabled_DoesNotHaveDisabledClass()
    {
        // Arrange & Act
        var cut = Render<StopButton>(parameters => parameters
            .Add(p => p.Disabled, false));

        // Assert
        cut.Find(".stop-button").ClassList.Should().NotContain("disabled");
    }

    [Fact]
    public void StopButton_RapidTaps_OnlyInvokesCallbackForEachTap()
    {
        // Arrange (T027b - Rapid tap debounce test)
        var invocationCount = 0;
        var cut = Render<StopButton>(parameters => parameters
            .Add(p => p.OnStop, EventCallback.Factory.Create(this, () => invocationCount++))
            .Add(p => p.Disabled, false));

        // Act - Simulate 3 rapid taps
        var button = cut.Find(".stop-button");
        button.Click();
        button.Click();
        button.Click();

        // Assert - Each tap should invoke the callback
        // Note: The game engine handles debouncing, not the button component
        invocationCount.Should().Be(3);
    }

    [Fact]
    public void StopButton_TouchStart_InvokesCallback()
    {
        // Arrange - Touch events are important for mobile
        var callbackInvoked = false;
        var cut = Render<StopButton>(parameters => parameters
            .Add(p => p.OnStop, EventCallback.Factory.Create(this, () => callbackInvoked = true))
            .Add(p => p.Disabled, false));

        // Act - Simulate touch start
        cut.Find(".stop-button").TouchStart();

        // Assert
        callbackInvoked.Should().BeTrue();
    }
}
