using Microsoft.JSInterop;

namespace Po.Reflex.Client.Services;

/// <summary>
/// Interop service for communicating with the JavaScript game engine.
/// </summary>
public class GameEngineInterop : IAsyncDisposable
{
    private readonly IJSRuntime _jsRuntime;
    private DotNetObjectReference<GameEngineInterop>? _dotNetRef;

    public event Action<GameCompleteResult>? OnGameComplete;
    public event Action<GameFailedResult>? OnGameFailed;
    public event Action<int, double>? OnBarStopped;

    public GameEngineInterop(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    /// <summary>
    /// Initialize the game engine with the canvas element.
    /// </summary>
    public async Task InitializeAsync(string canvasId = "game-canvas")
    {
        _dotNetRef = DotNetObjectReference.Create(this);
        await _jsRuntime.InvokeVoidAsync("GameEngine.init", canvasId);
        await _jsRuntime.InvokeVoidAsync("AudioSynth.init");
    }

    /// <summary>
    /// Start a new game.
    /// </summary>
    public async Task StartGameAsync()
    {
        await _jsRuntime.InvokeVoidAsync("AudioSynth.resume");

        // Register callbacks using the DotNetObjectReference
        await _jsRuntime.InvokeVoidAsync("eval", $@"
            window._gameEngineInterop = {{
                dotNetRef: DotNet.createJSObjectReference({{}})
            }};
            GameEngine.startGame({{
                onComplete: (result) => {{
                    DotNet.invokeMethodAsync('Po.Reflex.Client', 'HandleGameComplete', result.reactionTimes, result.averageMs);
                }},
                onFailed: (result) => {{
                    DotNet.invokeMethodAsync('Po.Reflex.Client', 'HandleGameFailed', result.reason, result.detail);
                }},
                onBarStopped: (barNum, time) => {{
                    DotNet.invokeMethodAsync('Po.Reflex.Client', 'HandleBarStopped', barNum, time);
                }}
            }});
        ");
    }

    /// <summary>
    /// Handle stop button press.
    /// </summary>
    public async Task HandleStopAsync()
    {
        await _jsRuntime.InvokeVoidAsync("GameEngine.handleStop");
    }

    /// <summary>
    /// Stop and cleanup the game.
    /// </summary>
    public async Task StopAsync()
    {
        await _jsRuntime.InvokeVoidAsync("GameEngine.stop");
    }

    /// <summary>
    /// Get current game state for debugging.
    /// </summary>
    public async Task<object> GetStateAsync()
    {
        return await _jsRuntime.InvokeAsync<object>("GameEngine.getState");
    }

    [JSInvokable]
    public void HandleGameCompleteCallback(double[] reactionTimes, double averageMs)
    {
        OnGameComplete?.Invoke(new GameCompleteResult(reactionTimes, averageMs));
    }

    [JSInvokable]
    public void HandleGameFailedCallback(string reason, string detail)
    {
        OnGameFailed?.Invoke(new GameFailedResult(reason, detail));
    }

    [JSInvokable]
    public void HandleBarStoppedCallback(int barNumber, double reactionTime)
    {
        OnBarStopped?.Invoke(barNumber, reactionTime);
    }

    public async ValueTask DisposeAsync()
    {
        _dotNetRef?.Dispose();
        await _jsRuntime.InvokeVoidAsync("GameEngine.stop");
    }
}

/// <summary>
/// Result when game completes successfully.
/// </summary>
public record GameCompleteResult(double[] ReactionTimes, double AverageMs);

/// <summary>
/// Result when game fails.
/// </summary>
public record GameFailedResult(string Reason, string Detail);
