/**
 * Playwright Global Setup
 * #6 - Docker healthcheck for E2E tests requiring Azurite
 */

import { execSync } from "child_process";

async function globalSetup() {
  console.log("\n🔍 Running E2E pre-flight checks...\n");

  // #6 - Check if Docker is available for Azurite container
  const dockerAvailable = checkDockerAvailability();
  
  if (!dockerAvailable) {
    console.warn("⚠️  Docker not available - E2E tests may fail if they require Azurite storage");
    console.warn("   Install Docker Desktop or ensure Docker daemon is running\n");
  } else {
    console.log("✅ Docker is available\n");
    
    // Check if Azurite container is running
    const azuriteRunning = checkAzuriteContainer();
    if (azuriteRunning) {
      console.log("✅ Azurite container is running\n");
    } else {
      console.warn("⚠️  Azurite container not running");
      console.warn("   Run: docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 mcr.microsoft.com/azure-storage/azurite\n");
    }
  }

  // Check API availability
  const apiAvailable = await checkApiAvailability();
  if (!apiAvailable) {
    console.warn("⚠️  API not responding at http://localhost:5000/api/health");
    console.warn("   Start the API with: dotnet run --project src/Po.Reflex.Api\n");
  } else {
    console.log("✅ API is responding\n");
  }

  // Check frontend availability
  const frontendAvailable = await checkFrontendAvailability();
  if (!frontendAvailable) {
    console.warn("⚠️  Frontend not responding at http://localhost:5173");
    console.warn("   The React (Vite) frontend (Po.Reflex.Web) may not be running\n");
  } else {
    console.log("✅ Frontend is responding\n");
  }
}

function checkDockerAvailability(): boolean {
  try {
    execSync("docker info", { 
      stdio: "pipe",
      timeout: 5000 
    });
    return true;
  } catch {
    return false;
  }
}

function checkAzuriteContainer(): boolean {
  try {
    const result = execSync('docker ps --filter "ancestor=mcr.microsoft.com/azure-storage/azurite" --format "{{.Names}}"', {
      stdio: "pipe",
      timeout: 5000,
      encoding: "utf-8"
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

async function checkApiAvailability(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:5000/api/health", {
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkFrontendAvailability(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:5173", {
      signal: AbortSignal.timeout(3000)
    });
    return response.ok || response.status === 404; // 404 is OK for SPA routes
  } catch {
    return false;
  }
}

export default globalSetup;
