import type {
  HealthStatusDto,
  LeaderboardResponse,
  ScoreSubmissionRequest,
  ScoreSubmissionResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Fetch helper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    // Disable caching for API calls in RSC
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check API health status
 */
export async function getHealthStatus(): Promise<HealthStatusDto> {
  try {
    return await fetchApi<HealthStatusDto>("/api/health");
  } catch {
    return {
      isHealthy: false,
      storageConnected: false,
      errorMessage: "Unable to connect to API",
    };
  }
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(
  type: "daily" | "alltime" = "alltime",
  top: number = 10
): Promise<LeaderboardResponse> {
  try {
    const endpoint = type === "daily" ? "/api/leaderboard/daily" : `/api/leaderboard/alltime?top=${top}`;
    return await fetchApi<LeaderboardResponse>(endpoint);
  } catch {
    return { entries: [] };
  }
}

/**
 * Submit game score
 */
export async function submitScore(
  request: ScoreSubmissionRequest
): Promise<ScoreSubmissionResponse> {
  try {
    return await fetchApi<ScoreSubmissionResponse>("/api/game/score", {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Failed to submit score",
    };
  }
}
