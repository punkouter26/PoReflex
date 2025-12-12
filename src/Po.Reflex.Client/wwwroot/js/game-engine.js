/**
 * PoReflex Game Engine
 * High-precision reaction time testing with 6 vertical bars.
 * Uses Canvas 2D for 60 FPS rendering and performance.now() for sub-millisecond timing.
 */

const GameEngine = (function() {
  'use strict';

  // Game constants
  const BAR_COUNT = 6;
  const BAR_GROWTH_DURATION_MS = 2000; // 2 seconds to reach 100%
  const MIN_WAIT_MS = 1000; // Minimum random wait before bar starts
  const MAX_WAIT_MS = 3000; // Maximum random wait before bar starts

  // Game state
  let canvas = null;
  let ctx = null;
  let gameState = 'idle'; // idle, waiting, moving, stopped, completed, failed
  let currentBar = 0;
  let barStates = [];
  let reactionTimes = [];
  let stimulusStartTime = 0;
  let animationFrameId = null;
  let waitTimeoutId = null;

  // Callbacks to Blazor
  let onGameComplete = null;
  let onGameFailed = null;
  let onBarStopped = null;

  // Colors (retro arcade theme)
  const COLORS = {
    background: '#000000',
    grid: '#1a1a1a',
    barReady: '#333333',
    barActive: '#00ff00', // Neon green
    barStopped: '#ff8c00', // Amber/orange
    text: '#00ff00',
    glow: 'rgba(0, 255, 0, 0.3)'
  };

  /**
   * Initialize the game engine with a canvas element.
   */
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error('Game canvas not found:', canvasId);
      return false;
    }

    ctx = canvas.getContext('2d');
    setupCanvas();
    setupVisibilityHandler();

    console.log('GameEngine initialized');
    return true;
  }

  /**
   * Setup canvas dimensions for responsive design.
   */
  function setupCanvas() {
    const container = canvas.parentElement || document.body;
    canvas.width = container.clientWidth || window.innerWidth;
    canvas.height = (container.clientHeight || window.innerHeight) * 0.85; // 85% for game area
    canvas.style.display = 'block';
  }

  /**
   * Setup Page Visibility API to detect app backgrounding (edge case).
   */
  function setupVisibilityHandler() {
    document.addEventListener('visibilitychange', function() {
      if (document.hidden && (gameState === 'waiting' || gameState === 'moving')) {
        failGame('GAME PAUSED', 'App was backgrounded during gameplay');
      }
    });
  }

  /**
   * Start a new game.
   */
  function startGame(callbacks) {
    onGameComplete = callbacks.onComplete;
    onGameFailed = callbacks.onFailed;
    onBarStopped = callbacks.onBarStopped;

    // Reset state
    gameState = 'idle';
    currentBar = 0;
    reactionTimes = [];
    barStates = Array(BAR_COUNT).fill(null).map(() => ({
      state: 'ready', // ready, waiting, moving, stopped
      progress: 0,
      reactionTime: null
    }));

    setupCanvas();
    render();
    startNextBar();
  }

  /**
   * Start the next bar's sequence.
   */
  function startNextBar() {
    if (currentBar >= BAR_COUNT) {
      completeGame();
      return;
    }

    gameState = 'waiting';
    barStates[currentBar].state = 'waiting';

    // Random wait interval (1.0 - 3.0 seconds)
    const waitTime = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);

    waitTimeoutId = setTimeout(() => {
      startBarMovement();
    }, waitTime);
  }

  /**
   * Start the current bar's upward movement.
   */
  function startBarMovement() {
    if (gameState === 'failed') return;

    gameState = 'moving';
    barStates[currentBar].state = 'moving';
    stimulusStartTime = performance.now();

    // Play ascending arpeggio sound
    if (window.AudioSynth) {
      AudioSynth.playAscendingArpeggio();
    }

    // Start animation loop
    animateBar();
  }

  /**
   * Animation loop for bar growth.
   */
  function animateBar() {
    if (gameState !== 'moving') return;

    const elapsed = performance.now() - stimulusStartTime;
    const progress = Math.min(elapsed / BAR_GROWTH_DURATION_MS, 1);
    barStates[currentBar].progress = progress;

    render();

    if (progress >= 1) {
      // Timeout - bar reached 100%
      failGame('TOO SLOW', 'Bar reached maximum height');
      return;
    }

    animationFrameId = requestAnimationFrame(animateBar);
  }

  /**
   * Handle stop button press.
   * Only the first tap per bar phase is registered (FR-008).
   */
  function handleStop() {
    // False start detection - stop pressed before bar moves
    if (gameState === 'waiting') {
      failGame('FALSE START', 'Pressed stop before bar started moving');
      return;
    }

    // Only register stop during movement phase
    if (gameState !== 'moving') {
      return; // Ignore subsequent taps (FR-008)
    }

    const responseTime = performance.now();
    const reactionTime = responseTime - stimulusStartTime;

    // Record reaction time with 0.05ms precision
    const preciseTime = Math.round(reactionTime * 20) / 20; // Round to nearest 0.05ms
    reactionTimes.push(preciseTime);
    barStates[currentBar].reactionTime = preciseTime;
    barStates[currentBar].state = 'stopped';
    barStates[currentBar].progress = barStates[currentBar].progress; // Freeze at current position

    gameState = 'stopped';

    // Cancel animation
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // Notify Blazor
    if (onBarStopped) {
      onBarStopped(currentBar + 1, preciseTime);
    }

    render();

    // Move to next bar
    currentBar++;
    setTimeout(() => {
      startNextBar();
    }, 500); // Brief pause between bars
  }

  /**
   * Complete the game and calculate results.
   */
  function completeGame() {
    gameState = 'completed';

    // Calculate average with 0.05ms precision
    const sum = reactionTimes.reduce((a, b) => a + b, 0);
    const average = Math.round((sum / reactionTimes.length) * 20) / 20;

    console.log('Game completed. Reaction times:', reactionTimes, 'Average:', average);

    render();

    if (onGameComplete) {
      onGameComplete({
        reactionTimes: reactionTimes,
        averageMs: average
      });
    }
  }

  /**
   * Fail the game.
   */
  function failGame(reason, detail) {
    gameState = 'failed';

    // Cancel any pending timeouts/animations
    if (waitTimeoutId) {
      clearTimeout(waitTimeoutId);
      waitTimeoutId = null;
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // Play failure sound
    if (window.AudioSynth) {
      AudioSynth.playFailureBuzz();
    }

    console.log('Game failed:', reason, detail);

    render();

    if (onGameFailed) {
      onGameFailed({
        reason: reason,
        detail: detail
      });
    }
  }

  /**
   * Render the game state to canvas.
   */
  function render() {
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    drawGrid(width, height);

    // Draw bars - leave room at top for status text (2 lines + padding)
    const barWidth = (width - 40) / BAR_COUNT - 10;
    const topMargin = 70; // Space for status text
    const barMaxHeight = height - topMargin - 60; // Leave room at top and bottom
    const startX = 20;
    const startY = height - 40;

    for (let i = 0; i < BAR_COUNT; i++) {
      const x = startX + i * (barWidth + 10);
      drawBar(x, startY, barWidth, barMaxHeight, i);
    }

    // Draw status text
    drawStatus(width, height);
  }

  /**
   * Draw background grid.
   */
  function drawGrid(width, height) {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  /**
   * Draw a single bar.
   */
  function drawBar(x, startY, width, maxHeight, index) {
    const bar = barStates[index];
    const barHeight = bar.progress * maxHeight;

    // Bar container (outline)
    ctx.strokeStyle = COLORS.barReady;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, startY - maxHeight, width, maxHeight);

    // Determine fill color
    let fillColor = COLORS.barReady;
    if (bar.state === 'moving') {
      fillColor = COLORS.barActive;
      // Add glow effect for active bars
      ctx.shadowColor = COLORS.glow;
      ctx.shadowBlur = 15;
    } else if (bar.state === 'stopped') {
      fillColor = COLORS.barStopped;
    }

    // Draw bar fill (grows from bottom up)
    if (bar.progress > 0 || bar.state === 'moving') {
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, startY - barHeight, width, barHeight);
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Bar number label
    ctx.fillStyle = COLORS.text;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((index + 1).toString(), x + width / 2, startY + 20);

    // Reaction time if stopped
    if (bar.reactionTime !== null) {
      ctx.fillStyle = COLORS.barStopped;
      ctx.font = '12px monospace';
      ctx.fillText(bar.reactionTime.toFixed(2) + 'ms', x + width / 2, startY - maxHeight - 10);
    }
  }

  /**
   * Draw game status text.
   */
  function drawStatus(width, height) {
    ctx.textAlign = 'center';
    
    // Responsive font size based on canvas width
    const fontSize = Math.min(24, Math.max(16, width / 18));
    ctx.font = `bold ${fontSize}px monospace`;
    const statusY = fontSize + 10;

    if (gameState === 'waiting') {
      ctx.fillStyle = COLORS.text;
      ctx.fillText('GET READY...', width / 2, statusY);
    } else if (gameState === 'moving') {
      ctx.fillStyle = COLORS.barActive;
      ctx.fillText('STOP!', width / 2, statusY);
    } else if (gameState === 'completed') {
      ctx.fillStyle = COLORS.barStopped;
      const avg = Math.round((reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) * 20) / 20;
      // Split into two lines for better mobile display
      ctx.fillText('COMPLETE!', width / 2, statusY);
      ctx.font = `bold ${fontSize * 0.9}px monospace`;
      ctx.fillText('AVG: ' + avg.toFixed(2) + 'ms', width / 2, statusY + fontSize + 4);
    } else if (gameState === 'failed') {
      ctx.fillStyle = '#ff0000';
      ctx.fillText('FAILED', width / 2, statusY);
    }
  }

  /**
   * Stop and cleanup the game.
   */
  function stop() {
    if (waitTimeoutId) {
      clearTimeout(waitTimeoutId);
      waitTimeoutId = null;
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    gameState = 'idle';
    if (canvas) {
      canvas.style.display = 'none';
    }
  }

  /**
   * Get current game state for debugging.
   */
  function getState() {
    return {
      gameState,
      currentBar,
      reactionTimes,
      barStates
    };
  }

  // Public API
  return {
    init,
    startGame,
    handleStop,
    stop,
    getState
  };
})();

// Make available globally for Blazor interop
window.GameEngine = GameEngine;
