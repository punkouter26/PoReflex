import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GameEngine, getGameEngine } from "@/lib/game-engine";
import { AudioSynth } from "@/lib/audio-synth";
import { submitScore } from "@/lib/api";
import { saveLocalScore } from "@/lib/storage";
import { StopButton } from "./StopButton";
import type { GameState, GameResult, FailureResult } from "@/lib/types";

/**
 * Game page — renders the reaction-time canvas and controls.
 * Redirects to / when the nickname query param is missing.
 *
 * Score submission strategy (Resilient):
 *   1. Attempt to POST to the API.
 *   2. Always save locally regardless of result.
 *   3. Navigate home with ?submitted=true on success.
 */
export function GameClient() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nickname = searchParams.get("nickname") ?? "";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const gameStartedRef = useRef(false);

  const [gameState, setGameState] = useState<
    "idle" | "playing" | "completed" | "failed"
  >("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [averageMs, setAverageMs] = useState(0);
  const [failureReason, setFailureReason] = useState("");
  const [failureDetail, setFailureDetail] = useState("");

  // ─── Redirect when nickname is missing ───
  useEffect(() => {
    if (!nickname || nickname.trim().length < 3) {
      navigate("/", { replace: true });
    }
  }, [nickname, navigate]);

  // ─── Handlers ───

  const handleStop = useCallback(() => {
    if (isPlaying && engineRef.current) {
      engineRef.current.handleStop();
    }
  }, [isPlaying]);

  const handleSubmitScore = useCallback(async () => {
    const request = { nickname, averageMs, reactionTimes };

    // Always persist locally first (offline-first)
    saveLocalScore(request);

    // Attempt remote submission
    const response = await submitScore(request);

    if (response.success) {
      navigate(`/?submitted=true&nickname=${encodeURIComponent(nickname)}`);
    } else {
      console.warn("[game] Remote submit failed, score saved locally:", response.errorMessage);
      navigate(`/?submitted=true&nickname=${encodeURIComponent(nickname)}`);
    }
  }, [nickname, averageMs, reactionTimes, navigate]);

  const handleReturnHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // ─── Start game on mount ───
  useEffect(() => {
    if (gameStartedRef.current || !canvasRef.current) return;
    if (!nickname || nickname.trim().length < 3) return;

    gameStartedRef.current = true;

    const initAndStart = async () => {
      await AudioSynth.init();
      await AudioSynth.resume();

      if (!engineRef.current) {
        engineRef.current = getGameEngine();
        engineRef.current.init(canvasRef.current!);
      }

      setGameState("playing");
      setIsPlaying(true);

      engineRef.current.startGame({
        onComplete: (result: GameResult) => {
          setReactionTimes(result.reactionTimes);
          setAverageMs(result.averageMs);
          setGameState("completed");
          setIsPlaying(false);
          AudioSynth.playSuccessSound();
        },
        onFailed: (result: FailureResult) => {
          setFailureReason(result.reason);
          setFailureDetail(result.detail);
          setGameState("failed");
          setIsPlaying(false);
          AudioSynth.playFailureBuzz();
        },
        onBarStopped: (_barNumber: number, _reactionTime: number) => {
          AudioSynth.playStopBeep();
        },
        onStateChange: (state: GameState) => {
          if (state === "moving") AudioSynth.playAscendingArpeggio();
        },
      });
    };

    initAndStart();

    return () => {
      engineRef.current?.stop();
    };
  }, [nickname]);

  // Don't render game when nickname is invalid
  if (!nickname || nickname.trim().length < 3) return null;

  return (
    <div className="game-container" data-testid="game-container">
      {/* Game Stage — 85 % of viewport */}
      <div className="game-stage">
        <canvas
          ref={canvasRef}
          id="game-canvas"
          data-testid="game-canvas"
          className="w-full h-full"
        />

        {gameState === "completed" && (
          <div className="result-overlay" data-testid="result-overlay">
            <h2>COMPLETE!</h2>
            <p className="average-time" data-testid="average-time">
              {averageMs.toFixed(2)}ms
            </p>
            <p className="result-label">Average Reaction Time</p>
            <div className="reaction-times">
              {reactionTimes.map((time, i) => (
                <span key={i} className="time-badge">
                  {i + 1}: {time.toFixed(2)}ms
                </span>
              ))}
            </div>
            <button className="btn-submit" onClick={handleSubmitScore}>
              Submit Score
            </button>
          </div>
        )}

        {gameState === "failed" && (
          <div className="failure-overlay" data-testid="failure-overlay">
            <h2 className="failure-title" data-testid="failure-message">
              {failureReason}
            </h2>
            <p className="failure-detail">{failureDetail}</p>
            <button className="btn-retry" onClick={handleReturnHome}>
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Control Zone — 15 % of viewport */}
      <div className="control-zone">
        {gameState === "completed" || gameState === "failed" ? (
          <button
            className="menu-button"
            onClick={handleReturnHome}
            data-testid="menu-button"
          >
            <span className="menu-text">MAIN MENU</span>
          </button>
        ) : (
          <StopButton onStop={handleStop} disabled={!isPlaying} />
        )}
      </div>
    </div>
  );
}
