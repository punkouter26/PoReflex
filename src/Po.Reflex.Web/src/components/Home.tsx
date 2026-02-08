import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getHealthStatus, getLeaderboard } from "@/lib/api";
import {
  getSavedNickname,
  saveNickname,
  localScoresToLeaderboard,
} from "@/lib/storage";
import { NicknameInput } from "./NicknameInput";
import { Leaderboard } from "./Leaderboard";
import type { LeaderboardEntryDto } from "@/lib/types";

/**
 * Home page — nickname entry, leaderboard, and play button.
 * Remains fully functional when the API is offline:
 *   • Nickname is stored in localStorage
 *   • Leaderboard shows local scores
 *   • Play button is never blocked by API health
 */
export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [nickname, setNickname] = useState(getSavedNickname);
  const [isNicknameValid, setIsNicknameValid] = useState(false);
  const [isApiHealthy, setIsApiHealthy] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardEntryDto[]
  >([]);

  // Was a score just submitted? (redirect back from /game)
  const submitted = searchParams.get("submitted") === "true";
  const submittedNickname = searchParams.get("nickname") ?? undefined;

  // ─── Initial data fetch (replaces Next.js server component) ───
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [health, lb] = await Promise.all([
        getHealthStatus(),
        getLeaderboard("alltime", 10),
      ]);

      if (cancelled) return;

      setIsApiHealthy(health.isHealthy);

      if (lb.entries.length > 0) {
        setLeaderboardEntries(lb.entries);
      } else {
        // Offline fallback: show locally stored scores
        setLeaderboardEntries(localScoresToLeaderboard());
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Handlers ───

  const handleValidChange = useCallback((isValid: boolean) => {
    setIsNicknameValid(isValid);
  }, []);

  const handleStartGame = useCallback(() => {
    // Game is playable even offline — API health doesn't block
    if (isNicknameValid) {
      saveNickname(nickname);
      navigate(`/game?nickname=${encodeURIComponent(nickname)}`);
    }
  }, [isNicknameValid, nickname, navigate]);

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>PoReflex</h1>
        <p className="tagline">Test Your Reaction Time</p>

        {!isApiHealthy && (
          <p className="offline-status">⚠️ Offline Mode — scores saved locally</p>
        )}
      </header>

      {/* Nickname form */}
      <div className="nickname-form">
        <NicknameInput
          value={nickname}
          onChange={setNickname}
          onValidChange={handleValidChange}
        />

        <button
          className="btn-play"
          onClick={handleStartGame}
          disabled={!isNicknameValid}
          data-testid="start-button"
        >
          {isApiHealthy ? "Play" : "Play (Offline)"}
        </button>
      </div>

      {/* Leaderboard */}
      <section className="leaderboard-section">
        <Leaderboard
          initialEntries={leaderboardEntries}
          highlightNickname={submitted ? submittedNickname : undefined}
          isOnline={isApiHealthy}
        />
      </section>
    </div>
  );
}
