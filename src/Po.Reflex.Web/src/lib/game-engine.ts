/**
 * PoReflex Game Engine
 * High-precision reaction time testing with 6 vertical bars.
 * Uses Canvas 2D for 60 FPS rendering and performance.now() for sub-millisecond timing.
 *
 * Pattern: State Machine — each bar transitions through ready → waiting → moving → stopped.
 */

import type { BarState, GameState, GameResult, FailureResult } from "./types";

// ───────── Constants ─────────
const BAR_COUNT = 6;
const BAR_GROWTH_DURATION_MS = 2000; // 2 s to reach 100 %
const MIN_WAIT_MS = 1000; // minimum random wait
const MAX_WAIT_MS = 3000; // maximum random wait

// Retro arcade colour palette
const COLORS = {
  background: "#000000",
  grid: "#1a1a1a",
  barReady: "#333333",
  barActive: "#00ff00",
  barStopped: "#ff8c00",
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
  private waitTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private callbacks: GameCallbacks | null = null;

  // ───────── Lifecycle ─────────

  /** Initialise the engine with a target canvas. */
  init(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) {
      console.error("[engine] Failed to get 2D context");
      return false;
    }
    this.setupCanvas();
    this.setupVisibilityHandler();
    console.log("[engine] GameEngine initialized");
    return true;
  }

  private setupCanvas(): void {
    if (!this.canvas) return;
    const container = this.canvas.parentElement ?? document.body;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width || window.innerWidth;
    this.canvas.height = rect.height || window.innerHeight * 0.85;
    this.canvas.style.display = "block";
  }

  private setupVisibilityHandler(): void {
    const handler = () => {
      if (
        document.hidden &&
        (this.gameState === "waiting" || this.gameState === "moving")
      ) {
        this.failGame("GAME PAUSED", "App was backgrounded during gameplay");
      }
    };
    document.addEventListener("visibilitychange", handler);
  }

  // ───────── Game Flow ─────────

  /** Start a fresh 6-bar game. */
  startGame(callbacks: GameCallbacks): void {
    this.callbacks = callbacks;
    this.gameState = "idle";
    this.currentBar = 0;
    this.reactionTimes = [];
    this.barStates = Array.from({ length: BAR_COUNT }, () => ({
      state: "ready" as const,
      progress: 0,
      reactionTime: null,
    }));
    this.setupCanvas();
    this.render();
    this.startNextBar();
  }

  private startNextBar(): void {
    if (this.currentBar >= BAR_COUNT) {
      this.completeGame();
      return;
    }
    this.gameState = "waiting";
    this.barStates[this.currentBar].state = "waiting";
    this.callbacks?.onStateChange("waiting");

    const waitTime = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    this.waitTimeoutId = setTimeout(() => this.startBarMovement(), waitTime);
  }

  private startBarMovement(): void {
    if (this.gameState === "failed") return;
    this.gameState = "moving";
    this.barStates[this.currentBar].state = "moving";
    this.stimulusStartTime = performance.now();
    this.callbacks?.onStateChange("moving");
    this.animateBar();
  }

  private animateBar = (): void => {
    if (this.gameState !== "moving") return;
    const elapsed = performance.now() - this.stimulusStartTime;
    const progress = Math.min(elapsed / BAR_GROWTH_DURATION_MS, 1);
    this.barStates[this.currentBar].progress = progress;
    this.render();

    if (progress >= 1) {
      this.failGame("TOO SLOW", "Bar reached maximum height");
      return;
    }
    this.animationFrameId = requestAnimationFrame(this.animateBar);
  };

  /** Handle the player pressing STOP. */
  handleStop(): void {
    if (this.gameState === "waiting") {
      this.failGame("FALSE START", "Pressed stop before bar started moving");
      return;
    }
    if (this.gameState !== "moving") return;

    const reactionTime = performance.now() - this.stimulusStartTime;
    const preciseTime = Math.round(reactionTime * 20) / 20; // 0.05 ms precision

    this.reactionTimes.push(preciseTime);
    this.barStates[this.currentBar].reactionTime = preciseTime;
    this.barStates[this.currentBar].state = "stopped";
    this.gameState = "stopped";
    this.callbacks?.onStateChange("stopped");

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.callbacks?.onBarStopped(this.currentBar + 1, preciseTime);
    this.render();

    this.currentBar++;
    setTimeout(() => this.startNextBar(), 500);
  }

  private completeGame(): void {
    this.gameState = "completed";
    this.callbacks?.onStateChange("completed");

    const sum = this.reactionTimes.reduce((a, b) => a + b, 0);
    const average =
      Math.round((sum / this.reactionTimes.length) * 20) / 20;

    console.log(
      "[engine] Game completed. Reaction times:",
      this.reactionTimes,
      "Average:",
      average
    );
    this.render();
    this.callbacks?.onComplete({
      reactionTimes: this.reactionTimes,
      averageMs: average,
    });
  }

  private failGame(reason: string, detail: string): void {
    this.gameState = "failed";
    this.callbacks?.onStateChange("failed");

    if (this.waitTimeoutId) {
      clearTimeout(this.waitTimeoutId);
      this.waitTimeoutId = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log("[engine] Game failed:", reason, detail);
    this.render();
    this.callbacks?.onFailed({ reason, detail });
  }

  // ───────── Rendering ─────────

  private render(): void {
    if (!this.ctx || !this.canvas) return;
    const { width, height } = this.canvas;

    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, width, height);
    this.drawGrid(width, height);

    const barWidth = (width - 40) / BAR_COUNT - 10;
    const topMargin = 70;
    const barMaxHeight = height - topMargin - 60;
    const startX = 20;
    const startY = height - 40;

    for (let i = 0; i < BAR_COUNT; i++) {
      this.drawBar(startX + i * (barWidth + 10), startY, barWidth, barMaxHeight, i);
    }
    this.drawStatus(width);
  }

  private drawGrid(width: number, height: number): void {
    if (!this.ctx) return;
    this.ctx.strokeStyle = COLORS.grid;
    this.ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

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
    const isFutureBar = index > this.currentBar;

    if (isFutureBar) {
      this.ctx.strokeStyle = COLORS.grid;
      this.ctx.lineWidth = 1;
    } else {
      this.ctx.strokeStyle =
        bar.state === "stopped" ? COLORS.barStopped : COLORS.barReady;
      this.ctx.lineWidth = 2;
    }
    this.ctx.strokeRect(x, startY - maxHeight, width, maxHeight);

    let fillColor = COLORS.barReady;
    let shouldFill = false;

    if (bar.state === "moving" && bar.progress > 0) {
      fillColor = COLORS.barActive;
      shouldFill = true;
      this.ctx.shadowColor = COLORS.glow;
      this.ctx.shadowBlur = 15;
    } else if (bar.state === "stopped" && bar.progress > 0) {
      fillColor = COLORS.barStopped;
      shouldFill = true;
    }

    if (shouldFill) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(x, startY - barHeight, width, barHeight);
    }

    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;

    // Bar number label
    this.ctx.fillStyle = COLORS.text;
    this.ctx.font = "14px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText((index + 1).toString(), x + width / 2, startY + 20);

    // Reaction time label
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

  private drawStatus(width: number): void {
    if (!this.ctx) return;
    this.ctx.textAlign = "center";
    const fontSize = Math.min(24, Math.max(16, width / 18));
    this.ctx.font = `bold ${fontSize}px monospace`;
    const y = fontSize + 10;

    switch (this.gameState) {
      case "waiting":
        this.ctx.fillStyle = COLORS.text;
        this.ctx.fillText("GET READY...", width / 2, y);
        break;
      case "moving":
        this.ctx.fillStyle = COLORS.barActive;
        this.ctx.fillText("STOP!", width / 2, y);
        break;
      case "completed": {
        this.ctx.fillStyle = COLORS.barStopped;
        const avg =
          Math.round(
            (this.reactionTimes.reduce((a, b) => a + b, 0) /
              this.reactionTimes.length) *
              20
          ) / 20;
        this.ctx.fillText("COMPLETE!", width / 2, y);
        this.ctx.font = `bold ${fontSize * 0.9}px monospace`;
        this.ctx.fillText("AVG: " + avg.toFixed(2) + "ms", width / 2, y + fontSize + 4);
        break;
      }
      case "failed":
        this.ctx.fillStyle = COLORS.error;
        this.ctx.fillText("FAILED", width / 2, y);
        break;
    }
  }

  // ───────── Cleanup ─────────

  /** Stop and tear down the engine gracefully. */
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

  getState(): GameState {
    return this.gameState;
  }
}

// ───────── Singleton ─────────
let engineInstance: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!engineInstance) {
    engineInstance = new GameEngine();
  }
  return engineInstance;
}
