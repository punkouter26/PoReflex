// API Types matching Po.Reflex.Shared DTOs

export interface HealthStatusDto {
  isHealthy: boolean;
  storageConnected: boolean;
  errorMessage: string | null;
}

export interface LeaderboardEntryDto {
  rank: number;
  nickname: string;
  averageMs: number;
  timestamp: string;
}

export interface LeaderboardResponse {
  viewType?: string;
  entries: LeaderboardEntryDto[];
  asOf?: string | null;
}

export interface ScoreSubmissionRequest {
  nickname: string;
  averageMs: number;
  reactionTimes: number[];
  deviceFingerprint?: string;
}

export interface ScoreSubmissionResponse {
  success: boolean;
  rank?: number;
  errorMessage?: string;
}

// Diagnostics types
export interface DiagEntry {
  key: string;
  value: string;
}

export interface DiagResponse {
  environment: string;
  sections: Record<string, DiagEntry[]>;
}

// Game Engine Types
export interface GameResult {
  reactionTimes: number[];
  averageMs: number;
}

export interface FailureResult {
  reason: string;
  detail: string;
}

export interface BarState {
  state: "ready" | "waiting" | "moving" | "stopped";
  progress: number;
  reactionTime: number | null;
}

export type GameState =
  | "idle"
  | "waiting"
  | "moving"
  | "stopped"
  | "completed"
  | "failed";
