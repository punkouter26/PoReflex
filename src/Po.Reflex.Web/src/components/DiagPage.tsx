import { useState, useEffect } from "react";
import { getDiagnostics } from "@/lib/api";
import type { DiagResponse } from "@/lib/types";

/**
 * Diagnostics page — displays all connection strings, keys, and secrets
 * fetched from the /api/diag endpoint.  Middle characters are masked
 * server-side for security.
 */
export function DiagPage() {
  const [diag, setDiag] = useState<DiagResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDiagnostics()
      .then((data) => {
        if (data) {
          setDiag(data);
        } else {
          setError("Could not reach /api/diag. Is the API running?");
        }
      })
      .catch(() => setError("Failed to fetch diagnostics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="diag-container">
        <h1>Diagnostics</h1>
        <p className="loading">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diag-container">
        <h1>Diagnostics</h1>
        <p className="text-error">{error}</p>
        <div className="diag-section">
          <h2>Client Info</h2>
          <div className="diag-entry">
            <span className="diag-key">VITE_API_URL</span>
            <span className="diag-value">
              {import.meta.env.VITE_API_URL || "(empty — using proxy)"}
            </span>
          </div>
          <div className="diag-entry">
            <span className="diag-key">MODE</span>
            <span className="diag-value">{import.meta.env.MODE}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="diag-container">
      <h1>Diagnostics</h1>
      <p className="text-text-muted mb-4">
        Environment: <strong>{diag?.environment}</strong>
      </p>

      {diag &&
        Object.entries(diag.sections).map(([sectionName, entries]) => (
          <div key={sectionName} className="diag-section">
            <h2>{sectionName}</h2>
            {entries.map((entry) => (
              <div key={entry.key} className="diag-entry">
                <span className="diag-key">{entry.key}</span>
                <span className="diag-value">{entry.value}</span>
              </div>
            ))}
          </div>
        ))}

      {/* Client-side env vars */}
      <div className="diag-section">
        <h2>Client (Vite)</h2>
        <div className="diag-entry">
          <span className="diag-key">VITE_API_URL</span>
          <span className="diag-value">
            {import.meta.env.VITE_API_URL || "(empty — using proxy)"}
          </span>
        </div>
        <div className="diag-entry">
          <span className="diag-key">MODE</span>
          <span className="diag-value">{import.meta.env.MODE}</span>
        </div>
      </div>
    </div>
  );
}
