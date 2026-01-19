import { HomeClient } from "@/components/home-client";
import { Leaderboard } from "@/components/leaderboard";
import { getHealthStatus, getLeaderboard } from "@/lib/api";

// Server Component - fetches initial data
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; nickname?: string }>;
}) {
  const params = await searchParams;
  
  // Fetch initial data on the server (RSC)
  const [healthStatus, leaderboardData] = await Promise.all([
    getHealthStatus(),
    getLeaderboard("alltime", 10),
  ]);

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>PoReflex</h1>
        <p className="tagline">Test Your Reaction Time</p>

        {!healthStatus.isHealthy && (
          <p className="offline-status">⚠️ Offline Mode</p>
        )}
      </header>

      {/* Client Component for interactive nickname form */}
      <HomeClient isApiHealthy={healthStatus.isHealthy} />

      <section className="leaderboard-section">
        <Leaderboard
          initialData={leaderboardData}
          highlightNickname={params.submitted === "true" ? params.nickname : undefined}
        />
      </section>
    </div>
  );
}
