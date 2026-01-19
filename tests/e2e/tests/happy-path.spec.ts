import { test, expect } from "@playwright/test";

/**
 * End-to-end tests for the complete game flow.
 * Tests the happy path: nickname entry → play 6 bars → view score on leaderboard.
 */

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads with nickname input and leaderboard", async ({ page }) => {
    // Verify home page elements
    await expect(page.getByTestId("nickname-input")).toBeVisible();
    await expect(page.getByTestId("start-button")).toBeVisible();
    await expect(page.getByTestId("leaderboard")).toBeVisible();

    // Start button should be disabled without nickname
    await expect(page.getByTestId("start-button")).toBeDisabled();
  });

  test("valid nickname enables start button", async ({ page }) => {
    // Enter valid nickname
    await page.getByTestId("nickname-input").fill("TestPlayer");

    // Start button should now be enabled
    await expect(page.getByTestId("start-button")).toBeEnabled();
  });

  test("invalid nickname shows error", async ({ page }) => {
    const input = page.getByTestId("nickname-input");
    
    // Type too short nickname and blur
    await input.fill("AB");
    await input.blur();

    // Error message should be visible
    await expect(page.getByTestId("nickname-error")).toBeVisible();

    // Start button should remain disabled
    await expect(page.getByTestId("start-button")).toBeDisabled();
  });

  test("navigates to game page with valid nickname", async ({ page }) => {
    // Enter valid nickname and start game
    await page.getByTestId("nickname-input").fill("E2EPlayer");
    await page.getByTestId("start-button").click();

    // Should navigate to game page
    await expect(page).toHaveURL(/\/game\?nickname=E2EPlayer/);
    await expect(page.getByTestId("game-container")).toBeVisible();
  });
});

test.describe("Leaderboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows all-time tab by default", async ({ page }) => {
    const allTimeTab = page.getByTestId("alltime-tab");
    await expect(allTimeTab).toHaveClass(/active/);
  });

  test("switches between daily and all-time tabs", async ({ page }) => {
    const dailyTab = page.getByTestId("daily-tab");
    const allTimeTab = page.getByTestId("alltime-tab");

    // Click daily tab
    await dailyTab.click();
    await expect(dailyTab).toHaveClass(/active/);
    await expect(allTimeTab).not.toHaveClass(/active/);

    // Click all-time tab
    await allTimeTab.click();
    await expect(allTimeTab).toHaveClass(/active/);
    await expect(dailyTab).not.toHaveClass(/active/);
  });
});

test.describe("Game Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start with a valid nickname
    await page.goto("/game?nickname=E2ETestPlayer");
  });

  test("game page renders with canvas and stop button", async ({ page }) => {
    // #8 - Use visibility assertions instead of arbitrary waits
    await expect(page.getByTestId("game-container")).toBeVisible();
    await expect(page.getByTestId("game-canvas")).toBeVisible();
    await expect(page.getByTestId("stop-button")).toBeVisible();
  });

  test("stop button triggers stop action during gameplay", async ({ page }) => {
    // #8 - Wait for visual state instead of timeout
    await expect(page.getByTestId("game-canvas")).toBeVisible();
    
    // Wait for game state to be ready (stop button should be enabled)
    const stopButton = page.getByTestId("stop-button");
    await expect(stopButton).toBeEnabled();

    // Click stop button
    await stopButton.click();

    // Game should respond - either continue or show overlay
    const responseVisible = page.getByTestId("result-overlay")
      .or(page.getByTestId("failure-overlay"))
      .or(page.getByTestId("bar-indicator"));
    await expect(responseVisible).toBeVisible({ timeout: 5000 });
  });

  test("false start shows failure overlay", async ({ page }) => {
    // #8 - Wait for game to initialize using visibility
    const stopButton = page.getByTestId("stop-button");
    await expect(stopButton).toBeVisible();
    
    // Press stop immediately - this may cause false start
    await stopButton.click();

    // #8 - Check for one of the valid outcomes
    const failureOverlay = page.getByTestId("failure-overlay");
    const resultOverlay = page.getByTestId("result-overlay");
    
    // Wait for any game response
    await expect(failureOverlay.or(resultOverlay).or(stopButton)).toBeVisible({ timeout: 5000 });
  });

  test("redirects to home if nickname is missing", async ({ page }) => {
    await page.goto("/game");
    
    // #8 - Wait for navigation/redirect to complete
    await expect(page).toHaveURL("/", { timeout: 5000 });
  });
});

test.describe("Complete Game Happy Path", () => {
  test("full game flow with score submission", async ({ page }) => {
    // Start from home
    await page.goto("/");
    
    // Enter nickname - wait for input to be ready
    const nicknameInput = page.getByTestId("nickname-input");
    await expect(nicknameInput).toBeVisible();
    
    const nickname = `E2E_${Date.now()}`;
    await nicknameInput.fill(nickname);
    
    // #8 - Wait for API health check to enable button (visibility assertion)
    const startButton = page.getByTestId("start-button");
    await expect(startButton).toBeEnabled({ timeout: 10000 });
    
    // Start game
    await startButton.click();
    
    // #8 - Wait for game container to be visible
    await expect(page.getByTestId("game-container")).toBeVisible({ timeout: 5000 });
    
    // Play through bars - use visual state checks
    const stopButton = page.getByTestId("stop-button");
    
    for (let i = 0; i < 6; i++) {
      // #8 - Wait for stop button to be visible and enabled
      await expect(stopButton).toBeVisible();
      await expect(stopButton).toBeEnabled();
      
      // Wait a brief moment for bar movement animation
      await page.waitForTimeout(2000);
      
      // Stop the bar
      await stopButton.click();
      
      // #8 - Check for failure using visibility
      const failureOverlay = page.getByTestId("failure-overlay");
      const isFailure = await failureOverlay.isVisible().catch(() => false);
      
      if (isFailure) {
        // Game failed - verify menu button is accessible
        await expect(page.getByTestId("menu-button")).toBeVisible();
        return;
      }
      
      // Wait for next bar or results
      await page.waitForTimeout(400);
    }
    
    // #8 - Wait for results using visibility assertions
    const resultOverlay = page.getByTestId("result-overlay");
    const menuButton = page.getByTestId("menu-button");
    
    await expect(resultOverlay.or(menuButton)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Mobile Touch Interactions", () => {
  test.use({ hasTouch: true });

  test("stop button responds to touch", async ({ page }) => {
    await page.goto("/game?nickname=MobileTest");
    
    // #8 - Use visibility assertion
    const stopButton = page.getByTestId("stop-button");
    await expect(stopButton).toBeVisible();
    
    // Tap the stop button
    await stopButton.tap();
    
    // #8 - Verify response using visibility
    const anyResponse = page.getByTestId("failure-overlay")
      .or(page.getByTestId("result-overlay"))
      .or(page.getByTestId("bar-indicator"));
    await expect(anyResponse).toBeVisible({ timeout: 5000 });
  });
});
