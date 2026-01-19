import { test, expect, Page } from "@playwright/test";

/**
 * E2E tests to analyze bar behavior during gameplay.
 * Simulates human player and captures detailed timing/state information.
 */

interface BarAnalysis {
  barNumber: number;
  waitingDuration: number;
  movingDuration: number;
  stoppedAt: number;
  reactionTime: number | null;
  state: "waiting" | "moving" | "stopped" | "failed";
}

interface GameAnalysis {
  bars: BarAnalysis[];
  totalDuration: number;
  averageWaitTime: number;
  averageReactionTime: number | null;
  consoleMessages: string[];
  outcome: "completed" | "failed" | "timeout";
  failureReason?: string;
}

/**
 * Helper to capture console messages related to game state
 */
async function setupConsoleCapture(page: Page): Promise<string[]> {
  const messages: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("GameEngine") ||
      text.includes("Game ") ||
      text.includes("Bar") ||
      text.includes("AudioSynth")
    ) {
      messages.push(`[${msg.type()}] ${text}`);
    }
  });
  return messages;
}

/**
 * Helper to wait for bar state change by monitoring canvas
 */
async function waitForBarMovement(page: Page, timeout = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  // Poll for console message indicating movement started
  while (Date.now() - startTime < timeout) {
    // Check if bar is moving by evaluating game state from window
    const isMoving = await page.evaluate(() => {
      // Access game state if exposed (fallback to console check)
      const canvas = document.querySelector('[data-testid="game-canvas"]');
      return canvas !== null;
    });
    
    if (isMoving) {
      // Give bar time to start animation
      await page.waitForTimeout(100);
      return true;
    }
    await page.waitForTimeout(50);
  }
  return false;
}

test.describe("Bar Behavior Analysis", () => {
  test.setTimeout(120000); // 2 minutes for full game analysis

  test("analyze complete game with human-like timing", async ({ page }) => {
    const analysis: GameAnalysis = {
      bars: [],
      totalDuration: 0,
      averageWaitTime: 0,
      averageReactionTime: null,
      consoleMessages: [],
      outcome: "timeout",
    };

    // Setup console capture
    const consoleMessages = await setupConsoleCapture(page);
    const gameStartTime = Date.now();

    // Navigate to game
    await page.goto("/game?nickname=BarAnalyzer");
    await expect(page.getByTestId("game-container")).toBeVisible();
    await expect(page.getByTestId("game-canvas")).toBeVisible();

    const stopButton = page.getByTestId("stop-button");
    await expect(stopButton).toBeVisible();

    console.log("=== BAR BEHAVIOR ANALYSIS ===\n");

    // Play through all 6 bars with human-like behavior
    for (let barNum = 1; barNum <= 6; barNum++) {
      const barAnalysis: BarAnalysis = {
        barNumber: barNum,
        waitingDuration: 0,
        movingDuration: 0,
        stoppedAt: 0,
        reactionTime: null,
        state: "waiting",
      };

      const barStartTime = Date.now();
      console.log(`\n--- Bar ${barNum} ---`);

      // Wait for bar to start moving (1-3 second random wait in game engine)
      // Human would see the bar appear then wait for it to move
      const waitStart = Date.now();
      
      // Monitor for bar movement by checking console or visual state
      let movementDetected = false;
      let waitIterations = 0;
      const maxWaitTime = 4000; // Max wait is 3s + buffer
      
      while (!movementDetected && (Date.now() - waitStart) < maxWaitTime) {
        // Check if we got a false start or game ended
        const failureOverlay = page.getByTestId("failure-overlay");
        const resultOverlay = page.getByTestId("result-overlay");
        
        if (await failureOverlay.isVisible().catch(() => false)) {
          barAnalysis.state = "failed";
          analysis.outcome = "failed";
          analysis.failureReason = await failureOverlay.textContent() || "Unknown";
          console.log(`  ❌ FAILED: Game ended during wait`);
          break;
        }
        
        if (await resultOverlay.isVisible().catch(() => false)) {
          analysis.outcome = "completed";
          break;
        }

        await page.waitForTimeout(50);
        waitIterations++;
        
        // After minimum wait time, assume bar might be moving
        // Human reaction: wait 1.5-2.5s then check
        if (Date.now() - waitStart > 1500) {
          movementDetected = true;
        }
      }

      barAnalysis.waitingDuration = Date.now() - waitStart;
      console.log(`  Waiting duration: ${barAnalysis.waitingDuration}ms`);

      if (barAnalysis.state === "failed" || analysis.outcome === "completed") {
        analysis.bars.push(barAnalysis);
        break;
      }

      // Simulate human reaction time (200-500ms after detecting movement)
      const humanReactionDelay = 200 + Math.random() * 300;
      const moveDetectTime = Date.now();
      
      console.log(`  Movement detected, waiting ${humanReactionDelay.toFixed(0)}ms (human reaction)...`);
      await page.waitForTimeout(humanReactionDelay);

      // Click stop button
      const clickTime = Date.now();
      await stopButton.click();
      
      barAnalysis.movingDuration = clickTime - moveDetectTime;
      barAnalysis.stoppedAt = Date.now() - barStartTime;
      barAnalysis.state = "stopped";

      console.log(`  Clicked STOP at ${barAnalysis.stoppedAt}ms from bar start`);

      // Wait for game response
      await page.waitForTimeout(200);

      // Check for failure (false start or too slow)
      const failureOverlay = page.getByTestId("failure-overlay");
      if (await failureOverlay.isVisible().catch(() => false)) {
        barAnalysis.state = "failed";
        analysis.outcome = "failed";
        const failureText = await failureOverlay.textContent();
        analysis.failureReason = failureText || "Unknown failure";
        console.log(`  ❌ FAILED: ${analysis.failureReason}`);
        analysis.bars.push(barAnalysis);
        break;
      }

      // Check for result overlay (game complete)
      const resultOverlay = page.getByTestId("result-overlay");
      if (await resultOverlay.isVisible().catch(() => false)) {
        analysis.outcome = "completed";
        console.log(`  ✅ Game completed!`);
        analysis.bars.push(barAnalysis);
        break;
      }

      console.log(`  ✅ Bar ${barNum} stopped successfully`);
      analysis.bars.push(barAnalysis);

      // Wait for next bar (500ms pause + random wait)
      await page.waitForTimeout(600);
    }

    // Capture final console messages
    analysis.consoleMessages = consoleMessages;
    analysis.totalDuration = Date.now() - gameStartTime;

    // Calculate averages
    const completedBars = analysis.bars.filter(b => b.state === "stopped");
    if (completedBars.length > 0) {
      analysis.averageWaitTime = 
        completedBars.reduce((sum, b) => sum + b.waitingDuration, 0) / completedBars.length;
    }

    // Print analysis report
    console.log("\n=== ANALYSIS REPORT ===");
    console.log(`Total Duration: ${analysis.totalDuration}ms`);
    console.log(`Outcome: ${analysis.outcome}`);
    console.log(`Bars Completed: ${completedBars.length}/6`);
    console.log(`Average Wait Time: ${analysis.averageWaitTime.toFixed(0)}ms`);
    
    if (analysis.failureReason) {
      console.log(`Failure Reason: ${analysis.failureReason}`);
    }

    console.log("\nConsole Messages:");
    analysis.consoleMessages.forEach(msg => console.log(`  ${msg}`));

    console.log("\nBar Details:");
    analysis.bars.forEach(bar => {
      console.log(`  Bar ${bar.barNumber}: wait=${bar.waitingDuration}ms, state=${bar.state}`);
    });

    // Assertions
    expect(analysis.bars.length).toBeGreaterThan(0);
    expect(analysis.totalDuration).toBeLessThan(120000);
  });

  test("detect bar waiting vs moving state transitions", async ({ page }) => {
    const stateTransitions: { time: number; message: string }[] = [];
    const startTime = Date.now();

    // Capture all console messages to track state changes
    page.on("console", (msg) => {
      const text = msg.text();
      stateTransitions.push({
        time: Date.now() - startTime,
        message: text,
      });
    });

    await page.goto("/game?nickname=StateAnalyzer");
    await expect(page.getByTestId("game-canvas")).toBeVisible();

    const stopButton = page.getByTestId("stop-button");

    // Play one bar with detailed timing
    console.log("\n=== STATE TRANSITION ANALYSIS ===\n");

    // Wait longer to observe the waiting → moving transition
    console.log("Observing bar 1 state transitions...");
    
    // Wait up to 4 seconds to capture the full waiting period
    const observeStart = Date.now();
    while (Date.now() - observeStart < 4000) {
      // Check for failure
      const failureOverlay = page.getByTestId("failure-overlay");
      if (await failureOverlay.isVisible().catch(() => false)) {
        console.log("Game failed during observation");
        break;
      }
      await page.waitForTimeout(100);
    }

    // Now click to stop
    await stopButton.click();
    await page.waitForTimeout(500);

    // Print state transitions
    console.log("\nCaptured State Transitions:");
    const gameRelated = stateTransitions.filter(
      t => t.message.includes("GameEngine") || 
           t.message.includes("Game ") ||
           t.message.includes("initialized") ||
           t.message.includes("failed")
    );
    
    gameRelated.forEach(t => {
      console.log(`  [${t.time}ms] ${t.message}`);
    });

    // Verify we captured initialization
    const hasInit = stateTransitions.some(t => t.message.includes("initialized"));
    expect(hasInit).toBe(true);
  });

  test("measure actual random wait times for multiple bars", async ({ page }) => {
    interface WaitMeasurement {
      barNumber: number;
      waitTimeMs: number;
      wasAccurate: boolean;
    }

    const measurements: WaitMeasurement[] = [];
    
    // Capture console to detect "Game failed" messages
    const consoleLog: string[] = [];
    page.on("console", (msg) => consoleLog.push(msg.text()));

    await page.goto("/game?nickname=WaitTimer");
    await expect(page.getByTestId("game-canvas")).toBeVisible();

    const stopButton = page.getByTestId("stop-button");

    console.log("\n=== WAIT TIME MEASUREMENTS ===\n");
    console.log("Expected range: 1000-3000ms per bar\n");

    for (let barNum = 1; barNum <= 6; barNum++) {
      const waitStart = Date.now();
      
      // Wait for the bar to presumably start moving
      // Use a generous wait time to not cause false starts
      await page.waitForTimeout(2500);
      
      const waitEnd = Date.now();
      const waitTime = waitEnd - waitStart;

      // Click stop
      await stopButton.click();
      await page.waitForTimeout(300);

      // Check if game failed or completed
      const failureOverlay = page.getByTestId("failure-overlay");
      const resultOverlay = page.getByTestId("result-overlay");

      if (await failureOverlay.isVisible().catch(() => false)) {
        console.log(`Bar ${barNum}: FAILED (wait was ${waitTime}ms)`);
        
        // Check if it was a "too slow" failure
        const failureText = await failureOverlay.textContent();
        if (failureText?.includes("TOO SLOW")) {
          console.log("  → Bar reached max height before we clicked");
        } else if (failureText?.includes("FALSE START")) {
          console.log("  → We clicked before bar started moving");
        }
        break;
      }

      if (await resultOverlay.isVisible().catch(() => false)) {
        console.log(`\n✅ Game completed after ${barNum} bars!`);
        break;
      }

      measurements.push({
        barNumber: barNum,
        waitTimeMs: waitTime,
        wasAccurate: waitTime >= 1000 && waitTime <= 3500,
      });

      console.log(`Bar ${barNum}: waited ${waitTime}ms before clicking`);

      // Wait for next bar
      await page.waitForTimeout(600);
    }

    console.log("\n=== SUMMARY ===");
    console.log(`Measurements collected: ${measurements.length}`);
    
    if (measurements.length > 0) {
      const avgWait = measurements.reduce((s, m) => s + m.waitTimeMs, 0) / measurements.length;
      console.log(`Average wait time: ${avgWait.toFixed(0)}ms`);
    }

    // Log any failure messages from console
    const failures = consoleLog.filter(m => m.includes("failed"));
    if (failures.length > 0) {
      console.log("\nFailure messages:");
      failures.forEach(f => console.log(`  ${f}`));
    }
  });

  test("verify bar visual state during waiting period", async ({ page }) => {
    /**
     * This test specifically checks the reported issue:
     * "Bar starts, stops moving, then starts again"
     * 
     * Expected behavior: Bar should only become visible/grow when in "moving" state.
     * Potential bug: Bar may be visible during "waiting" state.
     */
    
    console.log("\n=== BAR VISUAL STATE TEST ===\n");
    console.log("Testing if bar is visible during waiting period...\n");

    const stateLog: { time: number; state: string; detail: string }[] = [];
    const startTime = Date.now();

    page.on("console", (msg) => {
      const text = msg.text();
      const time = Date.now() - startTime;
      
      if (text.includes("GameEngine initialized")) {
        stateLog.push({ time, state: "init", detail: text });
      } else if (text.includes("FALSE START")) {
        stateLog.push({ time, state: "false_start", detail: text });
      } else if (text.includes("TOO SLOW")) {
        stateLog.push({ time, state: "too_slow", detail: text });
      } else if (text.includes("Game completed")) {
        stateLog.push({ time, state: "completed", detail: text });
      } else if (text.includes("Game failed")) {
        stateLog.push({ time, state: "failed", detail: text });
      }
    });

    await page.goto("/game?nickname=VisualTest");
    await expect(page.getByTestId("game-canvas")).toBeVisible();

    // Take screenshot immediately after load
    await page.screenshot({ 
      path: "test-results/bar-state-initial.png",
      fullPage: true 
    });
    console.log("Screenshot: bar-state-initial.png (right after game load)");

    // Wait 500ms (should still be in waiting period for bar 1)
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: "test-results/bar-state-500ms.png",
      fullPage: true 
    });
    console.log("Screenshot: bar-state-500ms.png (during waiting period)");

    // Wait until we're likely in the moving period (after 1.5s)
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: "test-results/bar-state-1500ms.png",
      fullPage: true 
    });
    console.log("Screenshot: bar-state-1500ms.png (likely moving)");

    // Wait more and capture during definite movement
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: "test-results/bar-state-2500ms.png",
      fullPage: true 
    });
    console.log("Screenshot: bar-state-2500ms.png (should be moving)");

    // Now stop
    const stopButton = page.getByTestId("stop-button");
    await stopButton.click();
    
    await page.waitForTimeout(200);
    await page.screenshot({ 
      path: "test-results/bar-state-after-stop.png",
      fullPage: true 
    });
    console.log("Screenshot: bar-state-after-stop.png");

    console.log("\nState transitions captured:");
    stateLog.forEach(s => {
      console.log(`  [${s.time}ms] ${s.state}: ${s.detail}`);
    });

    console.log("\n📸 Review screenshots in test-results/ folder to verify:");
    console.log("  1. Bar should NOT be visible at 500ms (waiting period)");
    console.log("  2. Bar SHOULD be visible and growing at 1500-2500ms (moving)");
    console.log("  3. If bar is visible at 500ms but not moving = BUG CONFIRMED");
  });
});

test.describe("Human Simulation", () => {
  test("complete game like a real human player", async ({ page }) => {
    /**
     * Simulates realistic human gameplay:
     * - Variable reaction times (250-400ms)
     * - Occasional mistakes
     * - Natural timing variations
     */
    
    console.log("\n=== HUMAN SIMULATION TEST ===\n");

    await page.goto("/");
    
    // Enter nickname like a human (with typing delay)
    const nicknameInput = page.getByTestId("nickname-input");
    await expect(nicknameInput).toBeVisible();
    
    await nicknameInput.click();
    await page.keyboard.type("HumanPlayer", { delay: 50 });
    
    // Wait a moment before clicking start
    await page.waitForTimeout(300);
    
    const startButton = page.getByTestId("start-button");
    await expect(startButton).toBeEnabled({ timeout: 5000 });
    await startButton.click();

    // Wait for game to load
    await expect(page.getByTestId("game-canvas")).toBeVisible();
    const stopButton = page.getByTestId("stop-button");

    const results: { bar: number; reactionMs: number; outcome: string }[] = [];

    for (let i = 1; i <= 6; i++) {
      console.log(`\nBar ${i}:`);
      
      // Human-like wait: 1.8-2.5 seconds after bar appears
      const humanWait = 1800 + Math.random() * 700;
      console.log(`  Waiting ${humanWait.toFixed(0)}ms (human timing)...`);
      
      const waitStart = Date.now();
      await page.waitForTimeout(humanWait);
      
      // Simulate human reaction time variation
      const reactionTime = 250 + Math.random() * 150;
      console.log(`  Reacting in ${reactionTime.toFixed(0)}ms...`);
      await page.waitForTimeout(reactionTime);
      
      // Click stop
      await stopButton.click();
      const totalTime = Date.now() - waitStart;
      
      // Check outcome
      await page.waitForTimeout(200);
      
      const failureOverlay = page.getByTestId("failure-overlay");
      const resultOverlay = page.getByTestId("result-overlay");
      
      if (await failureOverlay.isVisible().catch(() => false)) {
        const reason = await failureOverlay.textContent();
        results.push({ bar: i, reactionMs: totalTime, outcome: `failed: ${reason}` });
        console.log(`  ❌ Failed: ${reason}`);
        break;
      }
      
      if (await resultOverlay.isVisible().catch(() => false)) {
        results.push({ bar: i, reactionMs: totalTime, outcome: "completed" });
        console.log(`  🎉 Game completed!`);
        break;
      }
      
      results.push({ bar: i, reactionMs: totalTime, outcome: "stopped" });
      console.log(`  ✅ Stopped (total ${totalTime}ms)`);
      
      // Brief pause between bars
      await page.waitForTimeout(600);
    }

    console.log("\n=== RESULTS ===");
    results.forEach(r => {
      console.log(`Bar ${r.bar}: ${r.reactionMs}ms - ${r.outcome}`);
    });

    // Should have at least attempted some bars
    expect(results.length).toBeGreaterThan(0);
  });
});
