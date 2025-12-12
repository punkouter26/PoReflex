using FluentAssertions;
using Microsoft.JSInterop;
using Moq;
using Po.Reflex.Client.Services;
using Xunit;

namespace Po.Reflex.Client.Tests;

/// <summary>
/// Tests for GameEngineInterop service (T033).
/// </summary>
public class GameEngineInteropTests
{
    private readonly Mock<IJSRuntime> _mockJsRuntime;
    private readonly GameEngineInterop _interop;

    public GameEngineInteropTests()
    {
        _mockJsRuntime = new Mock<IJSRuntime>();
        _interop = new GameEngineInterop(_mockJsRuntime.Object);
    }

    [Fact]
    public async Task Initialize_CallsGameEngineInit()
    {
        // Arrange
        var canvasId = "test-canvas";

        // Act
        await _interop.InitializeAsync(canvasId);

        // Assert
        _mockJsRuntime.Verify(
            js => js.InvokeAsync<Microsoft.JSInterop.Infrastructure.IJSVoidResult>(
                "GameEngine.init",
                It.Is<object[]>(args => (string)args[0] == canvasId)),
            Times.Once);
    }

    [Fact]
    public async Task Initialize_CallsAudioSynthInit()
    {
        // Act
        await _interop.InitializeAsync();

        // Assert
        _mockJsRuntime.Verify(
            js => js.InvokeAsync<Microsoft.JSInterop.Infrastructure.IJSVoidResult>(
                "AudioSynth.init",
                It.IsAny<object[]>()),
            Times.Once);
    }

    [Fact]
    public async Task StartGame_CallsAudioResume()
    {
        // Act
        await _interop.StartGameAsync();

        // Assert
        _mockJsRuntime.Verify(
            js => js.InvokeAsync<Microsoft.JSInterop.Infrastructure.IJSVoidResult>(
                "AudioSynth.resume",
                It.IsAny<object[]>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleStop_CallsGameEngineHandleStop()
    {
        // Act
        await _interop.HandleStopAsync();

        // Assert
        _mockJsRuntime.Verify(
            js => js.InvokeAsync<Microsoft.JSInterop.Infrastructure.IJSVoidResult>(
                "GameEngine.handleStop",
                It.IsAny<object[]>()),
            Times.Once);
    }

    [Fact]
    public async Task Stop_CallsGameEngineStop()
    {
        // Act
        await _interop.StopAsync();

        // Assert
        _mockJsRuntime.Verify(
            js => js.InvokeAsync<Microsoft.JSInterop.Infrastructure.IJSVoidResult>(
                "GameEngine.stop",
                It.IsAny<object[]>()),
            Times.Once);
    }

    [Fact]
    public void HandleGameCompleteCallback_RaisesOnGameCompleteEvent()
    {
        // Arrange
        GameCompleteResult? receivedResult = null;
        _interop.OnGameComplete += result => receivedResult = result;

        var times = new double[] { 200, 210, 220, 230, 240, 250 };
        var average = 225.0;

        // Act
        _interop.HandleGameCompleteCallback(times, average);

        // Assert
        receivedResult.Should().NotBeNull();
        receivedResult!.ReactionTimes.Should().BeEquivalentTo(times);
        receivedResult.AverageMs.Should().Be(average);
    }

    [Fact]
    public void HandleGameFailedCallback_RaisesOnGameFailedEvent()
    {
        // Arrange
        GameFailedResult? receivedResult = null;
        _interop.OnGameFailed += result => receivedResult = result;

        // Act
        _interop.HandleGameFailedCallback("FALSE START", "You tapped too early!");

        // Assert
        receivedResult.Should().NotBeNull();
        receivedResult!.Reason.Should().Be("FALSE START");
        receivedResult.Detail.Should().Be("You tapped too early!");
    }

    [Fact]
    public void HandleBarStoppedCallback_RaisesOnBarStoppedEvent()
    {
        // Arrange
        int? receivedBarNumber = null;
        double? receivedTime = null;
        _interop.OnBarStopped += (barNum, time) =>
        {
            receivedBarNumber = barNum;
            receivedTime = time;
        };

        // Act
        _interop.HandleBarStoppedCallback(3, 245.5);

        // Assert
        receivedBarNumber.Should().Be(3);
        receivedTime.Should().Be(245.5);
    }

    [Fact]
    public async Task Dispose_CallsGameEngineStop()
    {
        // Act
        await _interop.DisposeAsync();

        // Assert
        _mockJsRuntime.Verify(
            js => js.InvokeAsync<Microsoft.JSInterop.Infrastructure.IJSVoidResult>(
                "GameEngine.stop",
                It.IsAny<object[]>()),
            Times.Once);
    }
}
