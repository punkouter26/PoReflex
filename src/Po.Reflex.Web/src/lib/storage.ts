/**
 * Local storage fallback for offline-first resilience.
 * Stores scores in the browser when the API is unreachable,
 * enabling the game to remain fully functional without a backend.
 *
 * Pattern: Strategy — swap remote persistence for local transparency.
 */

import type { LeaderboardEntryDto, ScoreSubmissionRequest } from "./types";

const STORAGE_KEY = "poreflex_scores";
const NICKNAME_KEY = "poreflex_nickname";

interface StoredScore {
  nickname: string;
  averageMs: number;
  reactionTimes: number[];
  timestamp: string;
  synced: boolean;
}

// ───────── Score Persistence ─────────

/** Retrieve all locally stored scores, sorted fastest-first. */
export function getLocalScores(): StoredScore[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const scores: StoredScore[] = JSON.parse(raw);
    return scores.sort((a, b) => a.averageMs - b.averageMs);
  } catch {
    return [];
  }
}

/** Persist a new score to local storage. */
export function saveLocalScore(request: ScoreSubmissionRequest): void {
  try {
    const scores = getLocalScores();
    scores.push({
      nickname: request.nickname,
      averageMs: request.averageMs,
      reactionTimes: request.reactionTimes,
      timestamp: new Date().toISOString(),
      synced: false,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch (err) {
    console.warn("Failed to save score locally:", err);
  }
}

/** Mark a stored score as synced with the remote API. */
export function markScoreSynced(index: number): void {
  try {
    const scores = getLocalScores();
    if (scores[index]) {
      scores[index].synced = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    }
  } catch {
    /* non-critical */
  }
}

/** Return un-synced scores that still need to be pushed to the API. */
export function getUnsyncedScores(): StoredScore[] {
  return getLocalScores().filter((s) => !s.synced);
}

// ───────── Leaderboard Conversion ─────────

/** Convert local scores into the leaderboard DTO shape for display. */
export function localScoresToLeaderboard(): LeaderboardEntryDto[] {
  return getLocalScores()
    .slice(0, 10)
    .map((s, i) => ({
      rank: i + 1,
      nickname: s.nickname,
      averageMs: s.averageMs,
      timestamp: s.timestamp,
    }));
}

// ───────── Nickname Persistence ─────────

/** Remember the player's last-used nickname across sessions. */
export function getSavedNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Save the player's nickname for next visit. */
export function saveNickname(nickname: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    /* non-critical */
  }
}
