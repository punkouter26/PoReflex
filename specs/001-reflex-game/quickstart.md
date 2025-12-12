# Quickstart: PoReflex Reaction Time Game

**Feature**: 001-reflex-game
**Date**: 2025-12-11

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) (locked via `global.json`)
- [Node.js 20+](https://nodejs.org/) (for Playwright E2E tests)
- [Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite) (Azure Storage emulator)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (for deployment)
- [Azure Developer CLI (azd)](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/install-azd) (for infrastructure)

## Local Development Setup

### 1. Clone and Restore

```powershell
git clone https://github.com/[your-org]/PoReflex.git
cd PoReflex
dotnet restore
```

### 2. Start Azurite (Azure Storage Emulator)

```powershell
# Install Azurite globally (one-time)
npm install -g azurite

# Start Azurite (in a separate terminal)
azurite --silent --location .azurite --debug .azurite/debug.log
```

### 3. Run the Application

**Option A: VS Code (Recommended)**
- Open the workspace in VS Code
- Press `F5` to launch with debugging
- Browser opens automatically via `serverReadyAction` in `launch.json`

**Option B: Command Line**
```powershell
cd src/Po.Reflex.Api
dotnet run
```

The application will be available at:
- **API**: `https://localhost:5001`
- **Swagger UI**: `https://localhost:5001/swagger`
- **Blazor Client**: `https://localhost:5001` (root)

### 4. Verify Setup

```powershell
# Check health endpoint
curl https://localhost:5001/api/health

# Expected response:
# {"isHealthy":true,"storageConnected":true,"errorMessage":null}
```

## Running Tests

### Unit Tests
```powershell
dotnet test tests/Po.Reflex.Api.Tests --filter "Category=Unit"
```

### Integration Tests
```powershell
# Ensure Azurite is running
dotnet test tests/Po.Reflex.Api.Tests --filter "Category=Integration"
```

### Component Tests (bUnit)
```powershell
dotnet test tests/Po.Reflex.Client.Tests
```

### E2E Tests (Playwright)
```powershell
# Install Playwright browsers (one-time)
cd tests/Po.Reflex.E2E
npx playwright install chromium

# Run E2E tests (starts API automatically)
dotnet test tests/Po.Reflex.E2E
```

### All Tests with Coverage
```powershell
dotnet test --collect:"XPlat Code Coverage"
# Coverage report generated in docs/coverage/
```

## Project Structure Overview

```
PoReflex/
├── src/
│   ├── Po.Reflex.Api/          # ASP.NET Core API (hosts Blazor WASM)
│   │   └── Features/           # Vertical slice feature folders
│   ├── Po.Reflex.Client/       # Blazor WASM frontend
│   │   └── wwwroot/js/         # Game engine & audio synthesis
│   └── Po.Reflex.Shared/       # DTOs & validation rules
├── tests/
│   ├── Po.Reflex.Api.Tests/    # Unit & integration tests
│   ├── Po.Reflex.Client.Tests/ # bUnit component tests
│   └── Po.Reflex.E2E/          # Playwright E2E tests
├── docs/
│   ├── README.md
│   └── kql/                    # Application Insights queries
├── infra/                      # Bicep infrastructure as code
└── specs/                      # Feature specifications
```

## Key Files

| File | Purpose |
|------|---------|
| `global.json` | Locks .NET SDK to 10.0.xxx |
| `Directory.Packages.props` | Centralized NuGet package management |
| `.vscode/launch.json` | F5 debug configuration |
| `src/Po.Reflex.Api/Program.cs` | API startup, middleware, DI configuration |
| `src/Po.Reflex.Client/wwwroot/js/game-engine.js` | Core game loop (60 FPS, timing) |

## Configuration

### appsettings.json (Development)
```json
{
  "ConnectionStrings": {
    "TableStorage": "UseDevelopmentStorage=true"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Debug"
    }
  }
}
```

### appsettings.Production.json
```json
{
  "ConnectionStrings": {
    "TableStorage": "FROM_KEYVAULT"
  },
  "KeyVault": {
    "VaultUri": "https://poreflex-kv.vault.azure.net/"
  }
}
```

## Deployment

### Initial Azure Setup (One-Time)
```powershell
# Login to Azure
az login
azd auth login

# Initialize infrastructure
azd init

# Provision resources (creates PoReflex-rg, PoReflex-app, etc.)
azd provision
```

### Deploy Application
```powershell
# Build and deploy
azd deploy
```

### CI/CD (GitHub Actions)
The repository includes `.github/workflows/deploy.yml` which:
1. Builds on push to `main`
2. Runs all tests
3. Deploys to Azure App Service using OIDC (no secrets)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Azurite connection refused | Ensure Azurite is running on default ports (10000-10002) |
| 503 on health check | Check Azure Table Storage connection string |
| Playwright tests timeout | Ensure API is building successfully; check port 5001 availability |
| F5 doesn't launch browser | Verify `launch.json` has `serverReadyAction` configured |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check system health |
| POST | `/api/game/submit` | Submit game score |
| GET | `/api/leaderboard/daily` | Today's top 10 |
| GET | `/api/leaderboard/alltime` | All-time top 10 |

Full API documentation available at `/swagger` when running locally.
