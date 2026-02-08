import { Routes, Route } from "react-router-dom";
import { Home } from "./components/Home";
import { GameClient } from "./components/GameClient";
import { DiagPage } from "./components/DiagPage";

/**
 * Root application component.
 * Uses React Router for client-side routing (replaces Next.js App Router).
 * The app is fully functional even when the .NET API is offline —
 * scores are stored locally in the browser and synced when API returns.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game" element={<GameClient />} />
      <Route path="/diag" element={<DiagPage />} />
    </Routes>
  );
}
