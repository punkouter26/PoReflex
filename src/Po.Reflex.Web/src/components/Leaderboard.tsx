import { useState, useCallback } from "react";
import { getLeaderboard } from "@/lib/api";
import { localScoresToLeaderboard } from "@/lib/storage";
import type { LeaderboardEntryDto } from "@/lib/types";

interface LeaderboardProps {
  initialEntries: LeaderboardEntryDto[];
  highlightNickname?: string;
  /** True when the remote API is reachable. */
  isOnline: boolean;
}

/**
 * Leaderboard widget with Daily / All-Time toggle.
 * Falls back to locally stored scores when the API is offline.
 *
 * Pattern: Observer — state is refreshed on tab toggle; the parent
 * supplies the initial snapshot.
 */
export function Leaderboard({
  initialEntries,
  highlightNickname,
  isOnline,
}: LeaderboardProps) {
  const [showDaily, setShowDaily] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] =
    useState<LeaderboardEntryDto[]>(initialEntries);

  const emptyMessage = showDaily
    ? "No scores today. Be the first!"
    : "No scores yet. Be the first!";

  // ─── Remote fetchers with local fallback ───

  const loadDaily = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOnline) {
        const res = await getLeaderboard("daily");
        setEntries(res.entries);
      } else {
        setEntries(localScoresToLeaderboard());
      }
    } catch {
      setEntries(localScoresToLeaderboard());
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  const loadAllTime = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOnline) {
        const res = await getLeaderboard("alltime", 10);
        setEntries(res.entries);
      } else {
        setEntries(localScoresToLeaderboard());
      }
    } catch {
      setEntries(localScoresToLeaderboard());
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  const handleShowDaily = useCallback(() => {
    setShowDaily(true);
    loadDaily();
  }, [loadDaily]);

  const handleShowAllTime = useCallback(() => {
    setShowDaily(false);
    loadAllTime();
  }, [loadAllTime]);

  // ─── Helpers ───

  const rankClass = (rank: number) => {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "bronze";
    return "";
  };

  const highlightClass = (entry: LeaderboardEntryDto) =>
    highlightNickname &&
    entry.nickname.toLowerCase() === highlightNickname.toLowerCase()
      ? "highlighted"
      : "";

  return (
    <div className="leaderboard" data-testid="leaderboard">
      <div className="leaderboard-toggle">
        <button
          className={`toggle-btn ${showDaily ? "active" : ""}`}
          onClick={handleShowDaily}
          data-testid="daily-tab"
        >
          {isOnline ? "Daily" : "Local"}
        </button>
        <button
          className={`toggle-btn ${!showDaily ? "active" : ""}`}
          onClick={handleShowAllTime}
          data-testid="alltime-tab"
        >
          {isOnline ? "All-Time" : "Local Best"}
        </button>
      </div>

      <div className="leaderboard-list" data-testid="leaderboard-list">
        {isLoading ? (
          <p className="loading">Loading</p>
        ) : entries.length === 0 ? (
          <p className="empty-message">{emptyMessage}</p>
        ) : (
          entries.map((entry) => (
            <div
              key={`${entry.rank}-${entry.nickname}`}
              className={`leaderboard-entry ${highlightClass(entry)}`}
            >
              <span className={`rank ${rankClass(entry.rank)}`}>
                #{entry.rank}
              </span>
              <span className="nickname">{entry.nickname}</span>
              <span className="score">{entry.averageMs.toFixed(2)}ms</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
