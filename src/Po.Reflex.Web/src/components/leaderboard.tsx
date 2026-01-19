"use client";

import { useState, useCallback } from "react";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardResponse, LeaderboardEntryDto } from "@/lib/types";

interface LeaderboardProps {
  initialData: LeaderboardResponse;
  highlightNickname?: string;
}

export function Leaderboard({ initialData, highlightNickname }: LeaderboardProps) {
  const [showDaily, setShowDaily] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntryDto[]>(initialData.entries);

  const emptyMessage = showDaily
    ? "No scores today. Be the first!"
    : "No scores yet. Be the first!";

  const loadDaily = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getLeaderboard("daily");
      setEntries(response.entries);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllTime = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getLeaderboard("alltime", 10);
      setEntries(response.entries);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleShowDaily = useCallback(() => {
    setShowDaily(true);
    loadDaily();
  }, [loadDaily]);

  const handleShowAllTime = useCallback(() => {
    setShowDaily(false);
    loadAllTime();
  }, [loadAllTime]);

  const getRankClass = (rank: number): string => {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "bronze";
    return "";
  };

  const getHighlightClass = (entry: LeaderboardEntryDto): string => {
    return highlightNickname &&
      entry.nickname.toLowerCase() === highlightNickname.toLowerCase()
      ? "highlighted"
      : "";
  };

  return (
    <div className="leaderboard" data-testid="leaderboard">
      <div className="leaderboard-toggle">
        <button
          className={`toggle-btn ${showDaily ? "active" : ""}`}
          onClick={handleShowDaily}
          data-testid="daily-tab"
        >
          Daily
        </button>
        <button
          className={`toggle-btn ${!showDaily ? "active" : ""}`}
          onClick={handleShowAllTime}
          data-testid="alltime-tab"
        >
          All-Time
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
              className={`leaderboard-entry ${getHighlightClass(entry)}`}
            >
              <span className={`rank ${getRankClass(entry.rank)}`}>
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
