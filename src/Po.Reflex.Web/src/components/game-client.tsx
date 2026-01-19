"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GameEngine, getGameEngine } from "@/lib/game-engine";
import { AudioSynth } from "@/lib/audio-synth";
import { submitScore } from "@/lib/api";
import { StopButton } from "./stop-button";
import type { GameState, GameResult, FailureResult } from "@/lib/types";

interface GameClientProps {
  nickname: string;
}

export function GameClient({ nickname }: GameClientProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const gameStartedRef = useRef(false); // Prevent double-start in Strict Mode

  const [gameState, setGameState] = useState<"idle" | "playing" | "completed" | "failed">("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [averageMs, setAverageMs] = useState(0);
  const [failureReason, setFailureReason] = useState("");
  const [failureDetail, setFailureDetail] = useState("");

  const handleStop = useCallback(() => {
    if (isPlaying && engineRef.current) {
      engineRef.current.handleStop();
    }
  }, [isPlaying]);

  const handleSubmitScore = useCallback(async () => {
    const response = await submitScore({
      nickname,
      averageMs,
      reactionTimes,
    });

    if (response.success) {
      router.push(`/?submitted=true&nickname=${encodeURIComponent(nickname)}`);
    } else {
      console.error("Failed to submit score:", response.errorMessage);
      // Still navigate back, just without highlighting
      router.push("/");
    }
  }, [nickname, averageMs, reactionTimes, router]);

  const handleReturnHome = useCallback(() => {
    router.push("/");
  }, [router]);

  // Start game on mount - only once, prevent React Strict Mode double-fire
  useEffect(() => {
    // Prevent double-start in React Strict Mode
    if (gameStartedRef.current) return;
    if (!canvasRef.current) return;
    
    gameStartedRef.current = true;

    const initAndStart = async () => {
      // Initialize audio (requires user interaction)
      await AudioSynth.init();
      await AudioSynth.resume();

      // Initialize or get existing engine
      if (!engineRef.current) {
        engineRef.current = getGameEngine();
        engineRef.current.init(canvasRef.current!);
      }

      setGameState("playing");
      setIsPlaying(true);

      // Start the game with stable callback references
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
        onBarStopped: () => {
          AudioSynth.playStopBeep();
        },
        onStateChange: (state: GameState) => {
          if (state === "moving") {
            AudioSynth.playAscendingArpeggio();
          }
        },
      });
    };

    initAndStart();

    return () => {
      engineRef.current?.stop();
    };
  }, []); // Empty dependency array - run only on mount

  return (
    <div className="game-container" data-testid="game-container">
      {/* Game Stage - 85% of viewport */}
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

      {/* Control Zone - 15% of viewport */}
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
