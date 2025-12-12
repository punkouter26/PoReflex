# Research: PoReflex Reaction Time Game

**Feature**: 001-reflex-game
**Date**: 2025-12-11
**Status**: Complete

## Technology Decisions

### 1. Game Engine Architecture: JavaScript via Blazor Interop

**Decision**: Use raw JavaScript with HTML5 Canvas for the game loop, rendering, and timing—invoked from Blazor via JS interop.

**Rationale**: 
- Blazor WASM introduces ~5-10ms overhead per interop call, which would violate the ±5ms timing accuracy requirement (SC-002)
- `requestAnimationFrame` in native JS guarantees frame-accurate timing at 60 FPS
- `performance.now()` provides sub-millisecond precision (0.05ms) required for reaction time capture
- Canvas 2D API is lightweight and sufficient for simple bar rendering

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Pure Blazor rendering | Interop latency too high for frame-critical timing |
| Unity WebGL | Massive bundle size (~10MB+), overkill for 6 bars |
| PixiJS | Adds complexity; Canvas 2D sufficient for this use case |

### 2. Audio Synthesis: Web Audio API Oscillators

**Decision**: Generate 8-bit sounds programmatically using Web Audio API `OscillatorNode` with square waveform.

**Rationale**:
- Zero latency: no audio file loading/decoding delay
- Authentic retro sound: square waves match 1980s arcade aesthetic
- Small footprint: no audio asset downloads
- Precise timing: can trigger exactly when visual stimulus begins

**Implementation Pattern**:
```javascript
const audioCtx = new AudioContext();
const oscillator = audioCtx.createOscillator();
oscillator.type = 'square';
oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
oscillator.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.1);
oscillator.connect(audioCtx.destination);
oscillator.start();
```

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Pre-recorded MP3/WAV | Latency from decoding; larger bundle size |
| Howler.js | Abstraction adds complexity; raw API sufficient |

### 3. Data Storage: Azure Table Storage with Single Partition

**Decision**: Use Azure Table Storage with a single partition strategy (`PartitionKey="Leaderboard"`) for leaderboard data.

**Rationale**:
- Cost-effective: ~$0.00036/10,000 transactions at scale
- Fast queries: single partition = no cross-partition scans for Top 10
- Simple schema: perfect for key-value leaderboard entries
- Azurite support: seamless local development

**Schema Design**:
- `PartitionKey`: `"Daily-YYYY-MM-DD"` or `"AllTime"`
- `RowKey`: Composite of inverted score + timestamp for natural sort order
  - Format: `{9999999999 - score_in_ticks}_{timestamp_ticks}`
  - This allows `Take(10)` to return fastest scores without explicit sorting

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Azure SQL | $5/month budget exceeded; overkill for simple leaderboard |
| Cosmos DB | More expensive; Table Storage sufficient |
| Azure Blob Storage | Not optimized for query patterns |

### 4. Rate Limiting: Device Fingerprint + IP Address

**Decision**: Combine client-side device fingerprint with server-side IP address for rate limiting source identification.

**Rationale**:
- No authentication required (anonymous play preserved)
- Device fingerprint provides browser/device uniqueness
- IP address provides network-level identification
- Combined approach mitigates VPN/proxy abuse

**Implementation Pattern**:
- Client: Generate fingerprint using `navigator.userAgent`, screen resolution, timezone, canvas fingerprint
- Server: Extract IP from `X-Forwarded-For` or `RemoteIpAddress`
- Rate limit key: `SHA256(fingerprint + IP)`
- Limit: 10 submissions per minute per key

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| IP only | Too easily bypassed with VPN/mobile networks |
| Full authentication | Violates frictionless anonymous design goal |
| No rate limiting | Allows leaderboard flooding |

### 5. F1 Tier Constraints and Mitigations

**Decision**: Deploy to Azure App Service F1 (Free) tier to meet $5/month budget.

**Rationale**:
- F1 tier is free; all budget goes to Table Storage transactions
- 60 minutes/day CPU limit is sufficient for low-traffic reaction game
- 1GB memory is adequate for lightweight Blazor WASM host

**Constraints and Mitigations**:
| F1 Limitation | Mitigation |
|---------------|------------|
| No custom domains | Use `*.azurewebsites.net` (acceptable for MVP) |
| No deployment slots | Single production slot; blue-green via separate resource groups if needed |
| No Snapshot Debugger | Rely on Serilog structured logging to App Insights |
| No Profiler | Use client-side `performance.now()` for timing metrics |
| 60 min/day CPU | Lightweight API; game logic runs client-side |

## Best Practices Applied

### Vertical Slice Architecture
- Each feature (SubmitScore, GetLeaderboard) encapsulates endpoint, command/query, handler, and validation
- No horizontal layers (Controller/Service/Repository) to navigate
- Easy to test in isolation

### FluentValidation for Business Rules
- Validate nickname: letters only, 1-15 characters
- Validate score: reject average < 100ms (inhuman speed)
- Shared validators between API and Client via `Po.Reflex.Shared`

### RFC 7807 Problem Details
- All 4xx/5xx responses return standardized JSON:
```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Invalid Score",
  "status": 400,
  "detail": "Average reaction time below 100ms is not biologically possible",
  "instance": "/api/game/submit"
}
```

### Serilog Structured Logging
- Development: Console sink with colorized output
- Production: Application Insights sink
- Correlation IDs for request tracing

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| How to achieve 0.05ms timing precision? | JavaScript `performance.now()` in game engine |
| How to handle offline? | Fail immediately; no queueing (per clarification) |
| How to identify rate limit source? | Device fingerprint + IP (per clarification) |
| How to validate nicknames? | Letters only, no offensive filter (per clarification) |
| How to handle health check failure? | Disable Start, show "Offline", allow retry (per clarification) |
