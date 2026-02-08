/**
 * API client for communicating with the PoReflex .NET backend.
 * All methods gracefully degrade when the API is offline,
 * returning safe fallback values so the game remains playable.
 *
 * Pattern: Adapter — isolates HTTP transport from UI components.
 */

import type {
  HealthStatusDto,
  LeaderboardResponse,
  ScoreSubmissionRequest,
  ScoreSubmissionResponse,
  DiagResponse,
} from "./types";

/**
 * Base URL resolved at build time.
 * In development Vite proxies /api/* → http://localhost:5000 so this is empty.
 */
const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "";

// ───────── Generic Fetch Helper ─────────

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[api] ${options?.method ?? "GET"} ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ───────── Health ─────────

/** Check API health status. Returns a safe offline fallback on error. */
export async function getHealthStatus(): Promise<HealthStatusDto> {
  try {
    return await fetchApi<HealthStatusDto>("/api/health");
  } catch {
    console.warn("[api] Health check failed — entering offline mode");
    return {
      isHealthy: false,
      storageConnected: false,
      errorMessage: "Unable to connect to API",
    };
  }
}

// ───────── Leaderboard ─────────

/** Fetch remote leaderboard. Returns empty entries on failure. */
export async function getLeaderboard(
  type: "daily" | "alltime" = "alltime",
  top: number = 10
): Promise<LeaderboardResponse> {
  try {
    const endpoint =
      type === "daily"
        ? "/api/leaderboard/daily"
        : `/api/leaderboard/alltime?top=${top}`;
    return await fetchApi<LeaderboardResponse>(endpoint);
  } catch {
    console.warn("[api] Leaderboard fetch failed — returning empty list");
    return { entries: [] };
  }
}

// ───────── Score Submission ─────────

/** Submit a game score to the API. Returns failure DTO on error. */
export async function submitScore(
  request: ScoreSubmissionRequest
): Promise<ScoreSubmissionResponse> {
  try {
    return await fetchApi<ScoreSubmissionResponse>("/api/game/score", {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch (error) {
    console.warn("[api] Score submission failed:", error);
    return {
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "Failed to submit score",
    };
  }
}

// ───────── Diagnostics ─────────

/** Fetch the /api/diag diagnostics payload. */
export async function getDiagnostics(): Promise<DiagResponse | null> {
  try {
    return await fetchApi<DiagResponse>("/api/diag");
  } catch {
    console.warn("[api] Diagnostics endpoint unreachable");
    return null;
  }
}
