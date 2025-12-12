using Microsoft.Playwright;
using FluentAssertions;
using Xunit;

namespace Po.Reflex.E2E;

/// <summary>
/// End-to-end tests for the complete game flow.
/// Tests the happy path: nickname entry → play 6 bars → view score on leaderboard.
/// </summary>
public class HappyPathTests : IAsyncLifetime
{
    private IPlaywright? _playwright;
    private IBrowser? _browser;
    private IPage? _page;

    private const string BaseUrl = "http://localhost:5000";
    private const int GameTimeoutMs = 60000; // 60 seconds for full game
    private const int BlazorInitTimeoutMs = 30000; // 30 seconds for Blazor WASM to initialize

    public async Task InitializeAsync()
    {
        _playwright = await Playwright.CreateAsync();
        _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
        {
            Headless = true
        });
        _page = await _browser.NewPageAsync();
    }

    public async Task DisposeAsync()
    {
        if (_page != null) await _page.CloseAsync();
        if (_browser != null) await _browser.CloseAsync();
        _playwright?.Dispose();
    }

    /// <summary>
    /// Navigate to home page and wait for Blazor WASM to fully initialize.
    /// </summary>
    private async Task NavigateToHomeAndWaitForBlazorAsync()
    {
        await _page!.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        // Wait for Blazor to fully render the app (WASM download/init can take time)
        await _page.WaitForSelectorAsync("[data-testid='nickname-input']", new PageWaitForSelectorOptions { Timeout = BlazorInitTimeoutMs });
    }

    [Fact]
    public async Task HomePageLoads_WithNicknameInputAndLeaderboard()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        // Verify home page elements
        await Expect(_page!.Locator("[data-testid='nickname-input']")).ToBeVisibleAsync();
        await Expect(_page.Locator("[data-testid='start-button']")).ToBeVisibleAsync();
        await Expect(_page.Locator("[data-testid='leaderboard']")).ToBeVisibleAsync();

        // Start button should be disabled without nickname
        await Expect(_page.Locator("[data-testid='start-button']")).ToBeDisabledAsync();
    }

    [Fact]
    public async Task NicknameValidation_ValidNickname_EnablesStartButton()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        // Enter valid nickname
        await _page!.FillAsync("[data-testid='nickname-input']", "TestPlayer");

        // Start button should now be enabled
        await Expect(_page.Locator("[data-testid='start-button']")).ToBeEnabledAsync();
    }

    [Fact]
    public async Task NicknameValidation_InvalidNickname_ShowsError()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        // Enter invalid nickname (with special characters)
        await _page!.FillAsync("[data-testid='nickname-input']", "Test@Player!");

        // Error message should be visible
        await Expect(_page.Locator("[data-testid='nickname-error']")).ToBeVisibleAsync();

        // Start button should remain disabled
        await Expect(_page.Locator("[data-testid='start-button']")).ToBeDisabledAsync();
    }

    [Fact]
    public async Task StartGame_NavigatesToGamePage()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        // Enter valid nickname and start game
        await _page!.FillAsync("[data-testid='nickname-input']", "E2EPlayer");
        await _page.ClickAsync("[data-testid='start-button']");

        // Should navigate to game page
        await _page.WaitForURLAsync($"{BaseUrl}/game*");

        // Game canvas should be visible
        await Expect(_page.Locator("[data-testid='game-canvas']")).ToBeVisibleAsync();

        // Stop button should be visible
        await Expect(_page.Locator("[data-testid='stop-button']")).ToBeVisibleAsync();
    }

    [Fact(Skip = "Full game flow requires JS game engine running")]
    public async Task CompleteGameFlow_SixBars_ShowsResultAndLeaderboard()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        // Enter nickname and start
        await _page!.FillAsync("[data-testid='nickname-input']", "E2ETest");
        await _page.ClickAsync("[data-testid='start-button']");

        // Wait for game page
        await _page.WaitForURLAsync($"{BaseUrl}/game*");

        // Play through 6 bars
        for (int bar = 1; bar <= 6; bar++)
        {
            // Wait for bar to start moving (indicated by bar-active class or similar)
            await _page.WaitForFunctionAsync(
                "() => window.gameState?.barActive === true",
                new PageWaitForFunctionOptions { Timeout = 5000 }
            );

            // Wait a realistic reaction time (200-400ms)
            await Task.Delay(Random.Shared.Next(200, 400));

            // Click stop button
            await _page.ClickAsync("[data-testid='stop-button']");

            // Wait for bar to complete
            await _page.WaitForFunctionAsync(
                $"() => window.gameState?.completedBars === {bar}",
                new PageWaitForFunctionOptions { Timeout = 3000 }
            );
        }

        // After 6 bars, result overlay should appear
        await Expect(_page.Locator("[data-testid='result-overlay']"))
            .ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = 5000 });

        // Average time should be displayed
        await Expect(_page.Locator("[data-testid='average-time']")).ToBeVisibleAsync();

        // Leaderboard rank should be shown
        await Expect(_page.Locator("[data-testid='your-rank']")).ToBeVisibleAsync();
    }

    [Fact]
    public async Task Leaderboard_DailyAllTimeToggle_Works()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        // Default should show all-time leaderboard (showDaily = false by default)
        await Expect(_page!.Locator("[data-testid='alltime-tab']")).ToHaveClassAsync(".*active.*");

        // Click daily tab
        await _page.ClickAsync("[data-testid='daily-tab']");

        // Daily tab should now be active
        await Expect(_page.Locator("[data-testid='daily-tab']")).ToHaveClassAsync(".*active.*");
    }

    [Fact]
    public async Task FalseStart_ShowsFailureMessage()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        // Start game
        await _page!.FillAsync("[data-testid='nickname-input']", "FalseStarter");
        await _page.ClickAsync("[data-testid='start-button']");

        // Wait for game page
        await _page.WaitForURLAsync($"{BaseUrl}/game*");

        // Immediately click stop button (before bar starts moving) - false start
        await _page.ClickAsync("[data-testid='stop-button']");

        // Failure overlay should appear
        await Expect(_page.Locator("[data-testid='failure-overlay']"))
            .ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = 3000 });

        // Should show FALSE START message
        await Expect(_page.Locator("[data-testid='failure-message']"))
            .ToContainTextAsync("FALSE START");
    }

    [Fact]
    public async Task HealthCheck_ApiResponds()
    {
        var response = await _page!.APIRequest.GetAsync($"{BaseUrl}/api/health");
        response.Ok.Should().BeTrue();
    }

    private ILocatorAssertions Expect(ILocator locator) => Assertions.Expect(locator);
}

/// <summary>
/// Mobile device emulation tests for touch interactions.
/// </summary>
public class MobileHappyPathTests : IAsyncLifetime
{
    private IPlaywright? _playwright;
    private IBrowser? _browser;
    private IPage? _page;

    private const string BaseUrl = "http://localhost:5000";
    private const int BlazorInitTimeoutMs = 30000; // 30 seconds for Blazor WASM to initialize

    public async Task InitializeAsync()
    {
        _playwright = await Playwright.CreateAsync();
        _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
        {
            Headless = true
        });

        // Use mobile device emulation (iPhone 12)
        var context = await _browser.NewContextAsync(new BrowserNewContextOptions
        {
            ViewportSize = new ViewportSize { Width = 390, Height = 844 },
            UserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
            HasTouch = true,
            IsMobile = true,
            DeviceScaleFactor = 3
        });

        _page = await context.NewPageAsync();
    }

    public async Task DisposeAsync()
    {
        if (_page != null) await _page.CloseAsync();
        if (_browser != null) await _browser.CloseAsync();
        _playwright?.Dispose();
    }

    /// <summary>
    /// Navigate to home page and wait for Blazor WASM to fully initialize.
    /// </summary>
    private async Task NavigateToHomeAndWaitForBlazorAsync()
    {
        await _page!.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        // Wait for Blazor to fully render the app (WASM download/init can take time)
        await _page.WaitForSelectorAsync("[data-testid='nickname-input']", new PageWaitForSelectorOptions { Timeout = BlazorInitTimeoutMs });
    }

    [Fact]
    public async Task MobileLayout_PortraitMode_DisplaysCorrectly()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        // Page should render in portrait mode
        var viewport = _page!.ViewportSize;
        viewport!.Width.Should().BeLessThan(viewport.Height);

        // All main elements should be visible
        await Assertions.Expect(_page.Locator("[data-testid='nickname-input']")).ToBeVisibleAsync();
        await Assertions.Expect(_page.Locator("[data-testid='start-button']")).ToBeVisibleAsync();
    }

    [Fact]
    public async Task TouchInteraction_TapStartButton_Works()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        // Fill nickname with mobile input
        await _page!.FillAsync("[data-testid='nickname-input']", "MobilePlayer");

        // Use tap instead of click for mobile
        await _page.TapAsync("[data-testid='start-button']");

        // Should navigate to game
        await _page.WaitForURLAsync($"{BaseUrl}/game*");
    }

    [Fact]
    public async Task StopButton_TouchAreaCoversFullWidth()
    {
        await NavigateToHomeAndWaitForBlazorAsync();

        await _page!.FillAsync("[data-testid='nickname-input']", "TouchTest");
        await _page.TapAsync("[data-testid='start-button']");

        await _page.WaitForURLAsync($"{BaseUrl}/game*");

        // Get stop button bounding box
        var stopButton = _page.Locator("[data-testid='stop-button']");
        var boundingBox = await stopButton.BoundingBoxAsync();

        boundingBox.Should().NotBeNull();

        // Stop button should span nearly full width (with some padding)
        var viewport = _page.ViewportSize;
        boundingBox!.Width.Should().BeGreaterThan(viewport!.Width * 0.9f);
    }
}
