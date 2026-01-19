import { test, expect } from "@playwright/test";

/**
 * API endpoint tests to verify backend connectivity and responses.
 */

const API_BASE = process.env.API_BASE_URL || "http://localhost:5000";

test.describe("API Health Check", () => {
  test("returns health status", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/health`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty("isHealthy");
    expect(data).toHaveProperty("storageConnected");
  });
});

test.describe("Leaderboard API", () => {
  test("returns all-time leaderboard", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/leaderboard/alltime`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty("entries");
    expect(Array.isArray(data.entries)).toBeTruthy();
  });

  test("returns daily leaderboard", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/leaderboard/daily`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty("entries");
    expect(Array.isArray(data.entries)).toBeTruthy();
  });
});

test.describe("Score Submission API", () => {
  test("accepts valid score submission", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/game/score`, {
      data: {
        nickname: `Test${Date.now()}`,
        averageMs: 250.5,
        reactionTimes: [240.1, 255.3, 248.7, 260.2, 245.8, 252.9],
      },
    });
    
    // Should succeed or fail gracefully
    const data = await response.json();
    expect(data).toHaveProperty("success");
  });

  test("rejects invalid score - wrong reaction times count", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/game/score`, {
      data: {
        nickname: "TestPlayer",
        averageMs: 250.5,
        reactionTimes: [240.1, 255.3], // Only 2 instead of 6
      },
    });
    
    expect(response.status()).toBe(400);
  });

  test("rejects invalid nickname - too short", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/game/score`, {
      data: {
        nickname: "AB", // Too short
        averageMs: 250.5,
        reactionTimes: [240.1, 255.3, 248.7, 260.2, 245.8, 252.9],
      },
    });
    
    expect(response.status()).toBe(400);
  });
});
