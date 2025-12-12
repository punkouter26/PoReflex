# Implementation Plan: PoReflex Reaction Time Game

**Branch**: `001-reflex-game` | **Date**: 2025-12-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-reflex-game/spec.md`

## Summary

Build a high-precision reaction time testing game with 6 vertical bars, retro arcade aesthetic, and global leaderboard. The solution uses .NET 10 with Blazor WASM frontend (hybrid JS interop for 60 FPS game loop), Minimal APIs backend with Vertical Slice Architecture, and Azure Table Storage for leaderboard persistence. Deployed to Azure App Service (F1 tier) via Bicep/azd with $5/month budget constraint.

## Technical Context

**Language/Version**: C# / .NET 10 (global.json locked to 10.0.xxx SDK)
**Primary Dependencies**: Blazor WASM, MediatR, FluentValidation, Serilog, Azure.Data.Tables
**Storage**: Azure Table Storage (Azurite for local dev)
**Testing**: xUnit (unit/integration), bUnit (component), Playwright (E2E)
**Target Platform**: Web (Blazor WASM hosted by ASP.NET Core API)
**Project Type**: Web application (API hosts WASM client)
**Performance Goals**: 60 FPS gameplay, 0.05ms timing precision, <16ms audio latency
**Constraints**: $5/month Azure budget (F1 App Service), portrait-only, online-only (no offline)
**Scale/Scope**: Global leaderboard (Daily/All-Time Top 10), anonymous players, ~1000 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. Foundation** | | | |
| Solution Naming | `PoReflex` for .sln, Azure resources, `<title>` | ✅ PASS | PoReflex-rg, PoReflex-app |
| .NET Version | .NET 10, global.json locked | ✅ PASS | 10.0.xxx SDK |
| Package Management | Directory.Packages.props at root | ✅ PASS | Centralized NuGet |
| Null Safety | `<Nullable>enable</Nullable>` | ✅ PASS | All .csproj files |
| **II. Architecture** | | | |
| Code Organization | Vertical Slice in `/src/Po.Reflex.Api/Features/` | ✅ PASS | Feature-based |
| Design Philosophy | SOLID + GoF patterns | ✅ PASS | Document in README |
| API Design | Minimal APIs, API hosts Blazor WASM | ✅ PASS | Single host |
| Repository Structure | `/src`, `/tests`, `/docs`, `/infra`, `/scripts` | ✅ PASS | Standard layout |
| Separation of Concerns | ...Api, ...Client, ...Shared | ✅ PASS | 3 projects |
| **III. Implementation** | | | |
| API Documentation | Swagger/OpenAPI + .http files | ✅ PASS | |
| Health Checks | `api/health` endpoint | ✅ PASS | FR-032 |
| Error Handling | RFC 7807 Problem Details | ✅ PASS | IResult returns |
| UI Framework | Blazor WASM + Radzen only if needed | ✅ PASS | Standard controls |
| Responsive Design | Mobile-first, portrait, touch-friendly | ✅ PASS | FR-029, FR-030 |
| Debug Launch | F5 with launch.json | ✅ PASS | serverReadyAction |
| Keys | appsettings → Key Vault in Production | ✅ PASS | |
| Local Storage | Azurite | ✅ PASS | Table Storage emulator |
| **IV. Quality & Testing** | | | |
| Code Hygiene | No warnings, dotnet format | ✅ PASS | |
| TDD Workflow | Red → Green → Refactor | ✅ PASS | MediatR handlers |
| Test Naming | MethodName_State_Expected | ✅ PASS | |
| Code Coverage | 80% minimum, ≤50 tests total | ✅ PASS | docs/coverage/ |
| Unit Tests (xUnit) | Backend logic with mocks | ✅ PASS | |
| Component Tests (bUnit) | Blazor components | ✅ PASS | |
| Integration Tests | Happy path per endpoint | ✅ PASS | |
| E2E Tests (Playwright) | Chromium, mobile + desktop | ✅ PASS | |
| **V. Operations & Azure** | | | |
| Provisioning | Bicep in `/infra`, azd deploy | ✅ PASS | |
| CI/CD | GitHub Actions + OIDC | ✅ PASS | Federated Credentials |
| Required Services | App Insights, App Service, Storage | ✅ PASS | Same resource group |
| Cost Management | $5 budget, 80% alert | ✅ PASS | punkouter26@gmail.com |
| Logging | Serilog → Debug (Dev), App Insights (Prod) | ✅ PASS | appsettings driven |
| Telemetry | OpenTelemetry + Meter | ✅ PASS | |
| Production Diagnostics | Snapshot Debugger, Profiler | ⚠️ NOTE | F1 tier limitations |
| KQL Library | docs/kql/ | ✅ PASS | |

**Gate Status**: ✅ PASS - All constitution principles satisfied or noted. F1 tier constraint limits Snapshot Debugger/Profiler (documented in Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/001-reflex-game/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── Po.Reflex.Api/
│   ├── Features/
│   │   ├── Game/
│   │   │   ├── SubmitScore.cs          # Endpoint + MediatR handler + validation
│   │   │   └── GetHealth.cs            # Health check endpoint
│   │   └── Leaderboard/
│   │       ├── GetDailyTop10.cs
│   │       └── GetAllTimeTop10.cs
│   ├── Infrastructure/
│   │   ├── TableStorage/
│   │   │   └── LeaderboardRepository.cs
│   │   └── Middleware/
│   │       └── ProblemDetailsMiddleware.cs
│   ├── Program.cs
│   └── appsettings.json
├── Po.Reflex.Client/
│   ├── Pages/
│   │   ├── Home.razor                  # Nickname entry + leaderboard
│   │   └── Game.razor                  # Game stage (Blazor shell)
│   ├── Components/
│   │   ├── Leaderboard.razor
│   │   ├── NicknameInput.razor
│   │   └── StopButton.razor
│   ├── wwwroot/
│   │   ├── js/
│   │   │   ├── game-engine.js          # Canvas rendering, timing, physics
│   │   │   └── audio-synth.js          # Web Audio API 8-bit sounds
│   │   └── css/
│   │       └── retro-theme.css         # Scanlines, glow, arcade aesthetic
│   └── Program.cs
└── Po.Reflex.Shared/
    ├── DTOs/
    │   ├── ScoreSubmissionRequest.cs
    │   ├── LeaderboardEntryDto.cs
    │   └── HealthStatusDto.cs
    └── Validation/
        └── NicknameValidator.cs        # FluentValidation (letters only, 1-15 chars)

tests/
├── Po.Reflex.Api.Tests/
│   ├── Unit/
│   │   ├── SubmitScoreHandlerTests.cs
│   │   └── NicknameValidatorTests.cs
│   └── Integration/
│       └── LeaderboardEndpointTests.cs
├── Po.Reflex.Client.Tests/
│   └── Components/
│       ├── LeaderboardTests.cs
│       └── NicknameInputTests.cs
└── Po.Reflex.E2E/
    └── HappyPathTests.cs               # Playwright: full game flow

docs/
├── README.md
├── coverage/
└── kql/
    └── game-metrics.kql

infra/
├── main.bicep
├── modules/
│   ├── app-service.bicep
│   ├── storage.bicep
│   ├── app-insights.bicep
│   └── budget.bicep
└── main.parameters.json

scripts/
└── (helper scripts as needed)

.vscode/
└── launch.json                         # F5 debug configuration
```

**Structure Decision**: Web application structure following constitution II.Architecture. API hosts Blazor WASM client. Three `/src` projects enforce separation of concerns (Api, Client, Shared). JavaScript game engine via interop for 60 FPS performance-critical rendering.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| JavaScript game engine | 60 FPS, 0.05ms timing precision required | Pure Blazor WASM interop adds ~5-10ms latency per frame, violating SC-002 (±5ms accuracy) |
| F1 tier disables Snapshot Debugger/Profiler | $5/month budget constraint | Higher tiers exceed budget; standard logging via Serilog provides sufficient diagnostics |
