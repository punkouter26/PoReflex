# PoReflex - Reaction Time Testing Game

A high-precision reaction time testing game with 6 vertical bars, retro arcade aesthetic, and global leaderboard.

## Overview

PoReflex challenges players to test their reflexes by stopping 6 vertical bars as they grow upward. The game captures reaction times with millisecond precision and features competitive Daily and All-Time leaderboards.

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARCHITECTURE DIAGRAM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐     ┌─────────────────────────────────┐  │
│   │   Blazor WASM   │     │         ASP.NET Core API        │  │
│   │     Client      │────▶│   (Hosts WASM + Endpoints)      │  │
│   │                 │     │                                 │  │
│   │ ┌─────────────┐ │     │ ┌─────────────────────────────┐ │  │
│   │ │ JS Game     │ │     │ │ /api/health                 │ │  │
│   │ │ Engine      │ │     │ │ /api/game/score             │ │  │
│   │ │ (Canvas 2D) │ │     │ │ /api/leaderboard/daily      │ │  │
│   │ └─────────────┘ │     │ │ /api/leaderboard/alltime    │ │  │
│   │                 │     │ └─────────────────────────────┘ │  │
│   │ ┌─────────────┐ │     │                                 │  │
│   │ │ Web Audio   │ │     │ ┌─────────────────────────────┐ │  │
│   │ │ API (8-bit) │ │     │ │     MediatR + Validation    │ │  │
│   │ └─────────────┘ │     │ └─────────────────────────────┘ │  │
│   └─────────────────┘     └────────────────┬────────────────┘  │
│                                            │                    │
│                                            ▼                    │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                   Azure Table Storage                    │  │
│   │                                                          │  │
│   │   Partition: "Daily-2024-01-15"  │  Partition: "AllTime" │  │
│   │   RowKey: "9999999700_timestamp" │  RowKey: "999..."     │  │
│   │   (Inverted for natural sort)    │                       │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                   Monitoring & CI/CD                     │  │
│   │                                                          │  │
│   │   Application Insights  │  GitHub Actions  │  azd CLI    │  │
│   │   (Serilog + KQL)       │  (OIDC Auth)     │             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Blazor WASM with JavaScript interop for 60 FPS game loop
- **Backend**: .NET 10 Minimal APIs with Vertical Slice Architecture
- **Storage**: Azure Table Storage (Azurite for local development)
- **Testing**: xUnit, bUnit, Playwright
- **Infrastructure**: Bicep + Azure Developer CLI (azd)

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite) for local Table Storage
- [Node.js](https://nodejs.org/) (for Playwright browser installation)

## Getting Started

### 1. Clone and Build

```bash
git clone https://github.com/your-repo/PoReflex.git
cd PoReflex
dotnet restore
dotnet build
```

### 2. Start Azurite (Local Storage)

```bash
# In a separate terminal
azurite --silent --location ./azurite-data --debug ./azurite-debug.log
```

### 3. Run the Application

```bash
dotnet run --project src/Po.Reflex.Api
```

Or press **F5** in VS Code to launch with debugging.

The app will be available at `https://localhost:5001` (or the port shown in the console).

### 4. Run Tests

```bash
# All tests
dotnet test

# With coverage
dotnet test --collect:"XPlat Code Coverage"

# E2E tests (requires Playwright browsers)
pwsh tests/Po.Reflex.E2E/bin/Debug/net10.0/playwright.ps1 install
dotnet test tests/Po.Reflex.E2E
```

## Project Structure

```
PoReflex/
├── src/
│   ├── Po.Reflex.Api/          # ASP.NET Core API (hosts Blazor WASM)
│   │   └── Features/           # Vertical slices (Game/, Leaderboard/)
│   ├── Po.Reflex.Client/       # Blazor WASM frontend
│   │   ├── Pages/              # Razor pages (Home, Game)
│   │   ├── Components/         # Reusable components
│   │   └── wwwroot/js/         # JavaScript game engine & audio
│   └── Po.Reflex.Shared/       # DTOs and validators
├── tests/
│   ├── Po.Reflex.Api.Tests/    # Unit & integration tests
│   ├── Po.Reflex.Client.Tests/ # bUnit component tests
│   └── Po.Reflex.E2E/          # Playwright E2E tests
├── infra/                      # Bicep infrastructure
└── docs/                       # Documentation, KQL queries
```

## Architecture Decisions

- **JavaScript Game Engine**: Achieves 60 FPS with `performance.now()` for sub-millisecond timing accuracy
- **Web Audio API**: Synthesized 8-bit audio for zero-latency sound effects
- **Vertical Slice Architecture**: Features co-located in `/Features/{FeatureName}/`
- **Azure Table Storage**: Cost-effective leaderboard storage with inverted RowKey for natural sorting

## Configuration

### Local Development (`appsettings.Development.json`)

```json
{
  "ConnectionStrings": {
    "TableStorage": "UseDevelopmentStorage=true"
  }
}
```

### Production

Set via Azure App Service configuration or Key Vault:
- `ConnectionStrings__TableStorage`: Azure Storage connection string
- `ApplicationInsights__ConnectionString`: App Insights connection string

## Deployment

### Using Azure Developer CLI

```bash
azd init
azd provision
azd deploy
```

### Manual Deployment

```bash
cd infra
az deployment group create -g PoReflex-rg -f main.bicep -p main.parameters.json
dotnet publish src/Po.Reflex.Api -c Release -o ./publish
az webapp deploy -g PoReflex-rg -n PoReflex-app --src-path ./publish
```

## Game Rules

1. Enter a nickname (1-15 letters)
2. Press "Start Game" to begin
3. Wait for each of 6 bars to turn green and start growing
4. Tap "STOP" as fast as possible when each bar moves
5. Your average reaction time is calculated and submitted to the leaderboard

### Fail States

- **False Start**: Tapping before the bar moves ends the game
- **Timeout**: Letting a bar reach 100% height ends the game
- **Inhuman Speed**: Average times below 100ms are rejected

## License

MIT
