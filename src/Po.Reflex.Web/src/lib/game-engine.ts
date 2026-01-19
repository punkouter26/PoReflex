/**
 * PoReflex Game Engine
 * High-precision reaction time testing with 6 vertical bars.
 * Uses Canvas 2D for 60 FPS rendering and performance.now() for sub-millisecond timing.
 */

import type { BarState, GameState, GameResult, FailureResult } from "./types";

// Game constants
const BAR_COUNT = 6;
const BAR_GROWTH_DURATION_MS = 2000; // 2 seconds to reach 100%
const MIN_WAIT_MS = 1000; // Minimum random wait before bar starts
const MAX_WAIT_MS = 3000; // Maximum random wait before bar starts

// Colors (retro arcade theme)
const COLORS = {
  background: "#000000",
  grid: "#1a1a1a",
  barReady: "#333333",
  barActive: "#00ff00", // Neon green
  barStopped: "#ff8c00", // Amber/orange
  text: "#00ff00",
  glow: "rgba(0, 255, 0, 0.3)",
  error: "#ff0000",
};

interface GameCallbacks {
  onComplete: (result: GameResult) => void;
  onFailed: (result: FailureResult) => void;
  onBarStopped: (barNumber: number, reactionTime: number) => void;
  onStateChange: (state: GameState) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private gameState: GameState = "idle";
  private currentBar = 0;
  private barStates: BarState[] = [];
  private reactionTimes: number[] = [];
  private stimulusStartTime = 0;
  private animationFrameId: number | null = null;
  private waitTimeoutId: NodeJS.Timeout | null = null;
  private callbacks: GameCallbacks | null = null;

  /**
   * Initialize the game engine with a canvas element.
   */
  init(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    if (!this.ctx) {
      console.error("Failed to get 2D context");
      return false;
    }

    this.setupCanvas();
    this.setupVisibilityHandler();

    console.log("GameEngine initialized");
    return true;
  }

  /**
   * Setup canvas dimensions for responsive design.
   */
  private setupCanvas(): void {
    if (!this.canvas) return;

    const container = this.canvas.parentElement || document.body;
    const rect = container.getBoundingClientRect();
    
    // Set canvas dimensions based on container
    this.canvas.width = rect.width || window.innerWidth;
    this.canvas.height = rect.height || window.innerHeight * 0.85;
    this.canvas.style.display = "block";
  }

  /**
   * Setup Page Visibility API to detect app backgrounding.
   */
  private setupVisibilityHandler(): void {
    const handleVisibilityChange = () => {
      if (document.hidden && (this.gameState === "waiting" || this.gameState === "moving")) {
        this.failGame("GAME PAUSED", "App was backgrounded during gameplay");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  /**
   * Start a new game.
   */
  startGame(callbacks: GameCallbacks): void {
    this.callbacks = callbacks;

    // Reset state
    this.gameState = "idle";
    this.currentBar = 0;
    this.reactionTimes = [];
    this.barStates = Array(BAR_COUNT)
      .fill(null)
      .map(() => ({
        state: "ready" as const,
        progress: 0,
        reactionTime: null,
      }));

    this.setupCanvas();
    this.render();
    this.startNextBar();
  }

  /**
   * Start the next bar's sequence.
   */
  private startNextBar(): void {
    if (this.currentBar >= BAR_COUNT) {
      this.completeGame();
      return;
    }

    this.gameState = "waiting";
    this.barStates[this.currentBar].state = "waiting";
    this.callbacks?.onStateChange("waiting");

    // Random wait interval (1.0 - 3.0 seconds)
    const waitTime = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);

    this.waitTimeoutId = setTimeout(() => {
      this.startBarMovement();
    }, waitTime);
  }

  /**
   * Start the current bar's upward movement.
   */
  private startBarMovement(): void {
    if (this.gameState === "failed") return;

    this.gameState = "moving";
    this.barStates[this.currentBar].state = "moving";
    this.stimulusStartTime = performance.now();
    this.callbacks?.onStateChange("moving");

    // Start animation loop
    this.animateBar();
  }

  /**
   * Animation loop for bar growth.
   */
  private animateBar = (): void => {
    if (this.gameState !== "moving") return;

    const elapsed = performance.now() - this.stimulusStartTime;
    const progress = Math.min(elapsed / BAR_GROWTH_DURATION_MS, 1);
    this.barStates[this.currentBar].progress = progress;

    this.render();

    if (progress >= 1) {
      // Timeout - bar reached 100%
      this.failGame("TOO SLOW", "Bar reached maximum height");
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.animateBar);
  };

  /**
   * Handle stop button press.
   */
  handleStop(): void {
    // False start detection - stop pressed before bar moves
    if (this.gameState === "waiting") {
      this.failGame("FALSE START", "Pressed stop before bar started moving");
      return;
    }

    // Only register stop during movement phase
    if (this.gameState !== "moving") {
      return; // Ignore subsequent taps
    }

    const responseTime = performance.now();
    const reactionTime = responseTime - this.stimulusStartTime;

    // Record reaction time with 0.05ms precision
    const preciseTime = Math.round(reactionTime * 20) / 20;
    this.reactionTimes.push(preciseTime);
    this.barStates[this.currentBar].reactionTime = preciseTime;
    this.barStates[this.currentBar].state = "stopped";

    this.gameState = "stopped";
    this.callbacks?.onStateChange("stopped");

    // Cancel animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Notify callback
    this.callbacks?.onBarStopped(this.currentBar + 1, preciseTime);

    this.render();

    // Move to next bar
    this.currentBar++;
    setTimeout(() => {
      this.startNextBar();
    }, 500); // Brief pause between bars
  }

  /**
   * Complete the game and calculate results.
   */
  private completeGame(): void {
    this.gameState = "completed";
    this.callbacks?.onStateChange("completed");

    // Calculate average with 0.05ms precision
    const sum = this.reactionTimes.reduce((a, b) => a + b, 0);
    const average = Math.round((sum / this.reactionTimes.length) * 20) / 20;

    console.log("Game completed. Reaction times:", this.reactionTimes, "Average:", average);

    this.render();

    this.callbacks?.onComplete({
      reactionTimes: this.reactionTimes,
      averageMs: average,
    });
  }

  /**
   * Fail the game.
   */
  private failGame(reason: string, detail: string): void {
    this.gameState = "failed";
    this.callbacks?.onStateChange("failed");

    // Cancel any pending timeouts/animations
    if (this.waitTimeoutId) {
      clearTimeout(this.waitTimeoutId);
      this.waitTimeoutId = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log("Game failed:", reason, detail);

    this.render();

    this.callbacks?.onFailed({ reason, detail });
  }

  /**
   * Render the game state to canvas.
   */
  private render(): void {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, width, height);

    // Draw grid
    this.drawGrid(width, height);

    // Draw bars
    const barWidth = (width - 40) / BAR_COUNT - 10;
    const topMargin = 70;
    const barMaxHeight = height - topMargin - 60;
    const startX = 20;
    const startY = height - 40;

    for (let i = 0; i < BAR_COUNT; i++) {
      const x = startX + i * (barWidth + 10);
      this.drawBar(x, startY, barWidth, barMaxHeight, i);
    }

    // Draw status text
    this.drawStatus(width, height);
  }

  /**
   * Draw background grid.
   */
  private drawGrid(width: number, height: number): void {
    if (!this.ctx) return;

    this.ctx.strokeStyle = COLORS.grid;
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw a single bar.
   */
  private drawBar(
    x: number,
    startY: number,
    width: number,
    maxHeight: number,
    index: number
  ): void {
    if (!this.ctx) return;

    const bar = this.barStates[index];
    const barHeight = bar.progress * maxHeight;

    // Bar container (outline) - only show for completed/stopped bars or current bar
    const isCurrentBar = index === this.currentBar;
    const isPastBar = index < this.currentBar;
    const isFutureBar = index > this.currentBar;

    // Future bars: dim outline only
    if (isFutureBar) {
      this.ctx.strokeStyle = COLORS.grid;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, startY - maxHeight, width, maxHeight);
    } 
    // Current or past bars: full outline
    else {
      this.ctx.strokeStyle = bar.state === "stopped" ? COLORS.barStopped : COLORS.barReady;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, startY - maxHeight, width, maxHeight);
    }

    // Determine fill color and whether to draw
    let fillColor = COLORS.barReady;
    let shouldDrawFill = false;

    if (bar.state === "moving" && bar.progress > 0) {
      // Only draw fill when actually moving with progress
      fillColor = COLORS.barActive;
      shouldDrawFill = true;
      this.ctx.shadowColor = COLORS.glow;
      this.ctx.shadowBlur = 15;
    } else if (bar.state === "stopped" && bar.progress > 0) {
      // Show stopped bars
      fillColor = COLORS.barStopped;
      shouldDrawFill = true;
    }
    // Note: "waiting" and "ready" states do NOT draw fill - bar stays empty

    // Draw bar fill only when appropriate
    if (shouldDrawFill) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(x, startY - barHeight, width, barHeight);
    }

    // Reset shadow
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;

    // Bar number label
    this.ctx.fillStyle = COLORS.text;
    this.ctx.font = "14px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText((index + 1).toString(), x + width / 2, startY + 20);

    // Reaction time if stopped
    if (bar.reactionTime !== null) {
      this.ctx.fillStyle = COLORS.barStopped;
      this.ctx.font = "12px monospace";
      this.ctx.fillText(
        bar.reactionTime.toFixed(2) + "ms",
        x + width / 2,
        startY - maxHeight - 10
      );
    }
  }

  /**
   * Draw game status text.
   */
  private drawStatus(width: number, height: number): void {
    if (!this.ctx) return;

    this.ctx.textAlign = "center";
    const fontSize = Math.min(24, Math.max(16, width / 18));
    this.ctx.font = `bold ${fontSize}px monospace`;
    const statusY = fontSize + 10;

    if (this.gameState === "waiting") {
      this.ctx.fillStyle = COLORS.text;
      this.ctx.fillText("GET READY...", width / 2, statusY);
    } else if (this.gameState === "moving") {
      this.ctx.fillStyle = COLORS.barActive;
      this.ctx.fillText("STOP!", width / 2, statusY);
    } else if (this.gameState === "completed") {
      this.ctx.fillStyle = COLORS.barStopped;
      const avg =
        Math.round(
          (this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length) * 20
        ) / 20;
      this.ctx.fillText("COMPLETE!", width / 2, statusY);
      this.ctx.font = `bold ${fontSize * 0.9}px monospace`;
      this.ctx.fillText("AVG: " + avg.toFixed(2) + "ms", width / 2, statusY + fontSize + 4);
    } else if (this.gameState === "failed") {
      this.ctx.fillStyle = COLORS.error;
      this.ctx.fillText("FAILED", width / 2, statusY);
    }
  }

  /**
   * Stop and cleanup the game.
   */
  stop(): void {
    if (this.waitTimeoutId) {
      clearTimeout(this.waitTimeoutId);
      this.waitTimeoutId = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.gameState = "idle";
  }

  /**
   * Get current game state.
   */
  getState(): GameState {
    return this.gameState;
  }
}

// Singleton instance for global access
let engineInstance: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!engineInstance) {
    engineInstance = new GameEngine();
  }
  return engineInstance;
}
