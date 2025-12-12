<!--
================================================================================
SYNC IMPACT REPORT
================================================================================
Version Change: N/A → 1.0.0 (Initial ratification)
Bump Rationale: Initial version - first constitution adoption

Added Sections:
  ✓ I. Foundation (naming, .NET 10, NuGet, null safety)
  ✓ II. Architecture (vertical slice, SOLID, minimal APIs, repo structure)
  ✓ III. Implementation (API, health, errors, Blazor UI, dev environment)
  ✓ IV. Quality & Testing (code hygiene, TDD, coverage, xUnit/bUnit/Playwright)
  ✓ V. Operations & Azure (Bicep, CI/CD, logging, telemetry, KQL)
  ✓ Governance (amendment procedures)

Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section aligns with principles
  ✅ spec-template.md - Requirements structure supports constitution
  ✅ tasks-template.md - Phase structure supports testing discipline
  ⚠️ No command templates found to validate

Follow-up TODOs: None
================================================================================
-->

# PoReflex Constitution

## Core Principles

### I. Foundation

- **Solution Naming**: The `.sln` file name (e.g., `PoReflex`) is the base identifier. It MUST be used as the name for all Azure services/resource groups (e.g., `PoReflex-rg`, `PoReflex-app`), and the user-facing HTML `<title>`. When bookmarking, the name MUST be just `Po*` (e.g., `PoReflex`).
- **.NET Version**: All projects MUST target .NET 10. The `global.json` file MUST be locked to a `10.0.xxx` SDK version. Use latest C# features.
- **Package Management**: All NuGet packages MUST be managed centrally in a `Directory.Packages.props` file at the repository root.
- **Null Safety**: Nullable Reference Types (`<Nullable>enable</Nullable>`) MUST be enabled in all `.csproj` files.

### II. Architecture

- **Code Organization**: The API MUST use Vertical Slice Architecture. All API logic (endpoints, CQRS handlers) MUST be co-located by feature in `/src/Po.[AppName].Api/Features/`.
- **Design Philosophy**: Apply SOLID principles and standard GoF design patterns. Document their use in code comments or the `README.md` in the root directory.
- **API Design**: Use Minimal APIs for all new endpoints. The API project MUST host the Blazor WASM project.
- **Repository Structure**: Adhere to the standard root folder structure: `/src`, `/tests`, `/docs`, `/infra`, and `/scripts`.
  - `/src` projects MUST follow separation of concerns: `...Api`, `...Client`, and `...Shared`.
  - The `...Shared` project MUST only contain DTOs, contracts, and shared validation logic (e.g., FluentValidation rules) referenced by both `...Api` and `...Client`. It MUST NOT contain any business logic or data access code.
  - `/docs` contains `README.md` (describe app and how to run it), mermaid diagrams, KQL query library, and ADRs.
  - `/scripts` contains helper scripts that the coding LLM creates.

### III. Implementation

**API & Backend:**

- **API Documentation**: All API endpoints MUST have Swagger (OpenAPI) generation enabled. `.http` files MUST be maintained for manual verification.
- **Health Checks**: Implement a health check endpoint at `api/health` that validates connectivity to all external dependencies.
- **Error Handling**: All non-successful API responses (4xx, 5xx) MUST return an `IResult` that serializes to an RFC 7807 Problem Details JSON object. Use structured `ILogger.LogError` within all catch blocks.

**Frontend (Blazor):**

- **UI Framework**: Standard Blazor WASM controls are the primary component library. Radzen.Blazor MAY only be used for complex requirements as needed.
- **Responsive Design**: The UI MUST be mobile-first (portrait mode), responsive, fluid, and touch-friendly.

**Development Environment:**

- **Debug Launch**: The environment MUST support a one-step 'F5' debug launch for the API and browser. Commit a `launch.json` with a `serverReadyAction` to the repository.
- **Keys**: All keys MUST be stored in `appsettings.json` until the app is deployed to Azure. `Program.cs` MUST be configured to read from Azure Key Vault only when `ASPNETCORE_ENVIRONMENT` is `Production`. After deployment, both local and Azure code SHOULD refer to keys in Azure Key Vault, with the exception of local code using Azurite instead of Azure Storage.
- **Local Storage**: Use Azurite for local development and integration testing.

### IV. Quality & Testing

- **Code Hygiene**: All build warnings/errors MUST be resolved before pushing changes to GitHub. Run `dotnet format` to ensure style consistency.
- **Dependency Hygiene**: Regularly check for and apply updates to all packages via `Directory.Packages.props`.
- **Workflow**: Apply a TDD workflow (Red → Green → Refactor) for all business logic (e.g., MediatR handlers, domain services). For UI and E2E tests, tests MUST be written contemporaneously with the feature code.
- **Test Naming**: Test methods MUST follow the `MethodName_StateUnderTest_ExpectedBehavior` convention.
- **Code Coverage (dotnet-coverage)**:
  - Enforce a minimum 80% line coverage threshold for all new business logic.
  - Maximum 50 tests total in the entire solution.
  - A combined coverage report MUST be generated in `docs/coverage/`.
- **Unit Tests (xUnit)**: MUST cover all backend business logic (e.g., MediatR handlers) with all external dependencies mocked.
- **Component Tests (bUnit)**: MUST cover all new Blazor components (rendering, user interactions, state changes), mocking dependencies like `IHttpClientFactory`.
- **Integration Tests (xUnit)**: A "happy path" test MUST be created for every new API endpoint, running against a test host and an in-memory database emulator. Realistic test data SHOULD be generated.
- **E2E Tests (Playwright)**:
  - Start API before running E2E tests.
  - Tests MUST target Chromium (mobile and desktop views).
  - Full-Stack E2E (Default): Runs the entire stack (frontend + API + test database) to validate a true user flow.
  - Isolated E2E (By Exception): Uses network mocking only for specific scenarios that are difficult to set up (e.g., simulating a 3rd-party payment provider failure).
  - Integrate automated accessibility and visual regression checks.

### V. Operations & Azure

- **Provisioning**: All Azure infrastructure MUST be provisioned using Bicep (from the `/infra` folder) and deployed via Azure Developer CLI (azd).
- **CI/CD**: The GitHub Actions workflow MUST use Federated Credentials (OIDC) for secure, secret-less connection to Azure.
- **GitHub CI/CD**: The YML file MUST simply build the code and deploy it to the resource group (e.g., `PoProject-rg`) as an App Service (e.g., `PoProject-app`).
- **Required Services**: Bicep scripts MUST provision, at minimum: Application Insights & Log Analytics, App Service, and Azure Storage—all in the same resource group.
- **Cost Management**: A $5 monthly cost budget MUST be created for the application's resource group. The budget MUST be configured with an Action Group to send an email alert to `punkouter26@gmail.com` when 80% of the threshold is met.
- **Logging**:
  - Use Serilog for all structured logging.
  - Configuration MUST be driven by `appsettings.json` to write to the Debug Console (in Development) and Application Insights (in Production).
- **Telemetry**:
  - Use modern OpenTelemetry abstractions for all custom telemetry.
  - Metrics: Use `Meter` to create custom metrics for business-critical values.
- **Production Diagnostics**:
  - Enable the Application Insights Snapshot Debugger on the App Service.
  - Enable the Application Insights Profiler on the App Service.
- **KQL Library**: The `docs/kql/` folder MUST be populated with essential queries for monitoring app-specific parameters, users, actions performed, etc.

## Governance

This constitution supersedes all other development practices and conventions. All pull requests and code reviews MUST verify compliance with these principles.

**Amendment Procedure:**

1. Proposed amendments MUST be documented with rationale.
2. Amendments MUST be reviewed and approved before merging.
3. Version number MUST be incremented according to semantic versioning:
   - MAJOR: Backward-incompatible governance/principle removals or redefinitions.
   - MINOR: New principle/section added or materially expanded guidance.
   - PATCH: Clarifications, wording, typo fixes, non-semantic refinements.
4. All dependent templates and documentation MUST be updated to reflect changes.

**Compliance Review:**

- All code changes MUST be validated against constitution principles before merge.
- Complexity beyond these standards MUST be justified in the PR description.
- Runtime development guidance is maintained in `.specify/` templates.

**Version**: 1.0.0 | **Ratified**: 2025-12-11 | **Last Amended**: 2025-12-11
