# Feature Specification: PoReflex Reaction Time Game

**Feature Branch**: `001-reflex-game`  
**Created**: 2025-12-11  
**Status**: Draft  
**Input**: High-precision reaction time testing application with 6 vertical bars, retro arcade aesthetic, mobile-first design, and global leaderboard

## Clarifications

### Session 2025-12-11

- Q: How is "source" identified for rate limiting anonymous players? → A: Device fingerprint + IP address

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play Core Reaction Game (Priority: P1)

As a player, I want to test my reaction time by stopping 6 vertical bars as they grow upward, so that I can measure my reflexes with millisecond precision.

**Why this priority**: This is the fundamental gameplay loop. Without the ability to play the 6-bar reaction test, there is no product. Everything else builds on this core mechanic.

**Independent Test**: Can be fully tested by launching the app, entering a nickname, playing through 6 bars, and seeing the calculated average reaction time displayed. Delivers the core value proposition of measuring human reflexes.

**Acceptance Scenarios**:

1. **Given** I am on the home screen, **When** I enter a valid nickname and tap "Start Game", **Then** I see the game stage with 6 vertical bar lanes and a large Stop button at the bottom
2. **Given** a bar is in the "Ready" state, **When** a random interval (1.0-3.0 seconds) elapses, **Then** the bar turns neon green, begins growing upward, and an 8-bit audio cue plays simultaneously
3. **Given** a bar is actively growing, **When** I tap the Stop button, **Then** the bar freezes immediately, turns amber/orange, my reaction time is recorded, and focus shifts to the next bar
4. **Given** I have stopped all 6 bars successfully, **When** the last bar is stopped, **Then** I see my average reaction time calculated and displayed

---

### User Story 2 - Fail State Enforcement (Priority: P1)

As a player, I expect the game to enforce fair play rules that prevent cheating and ensure my score reflects genuine reflex ability.

**Why this priority**: Equally critical as the core game—without fail states, the game has no challenge and scores are meaningless. This enables competitive integrity.

**Independent Test**: Can be tested by intentionally triggering each fail condition (false start, timeout, inhuman speed) and verifying immediate game termination with appropriate feedback.

**Acceptance Scenarios**:

1. **Given** a bar is in the "Ready" state (not yet moving), **When** I tap the Stop button prematurely, **Then** the game ends immediately with a "FALSE START" message, a low-pitched buzz sound plays, and no score is recorded
2. **Given** a bar is actively growing, **When** the bar reaches 100% height (2.0 seconds elapsed) without being stopped, **Then** the game ends with a "TOO SLOW" message and no score is recorded
3. **Given** I complete a game, **When** my average reaction time is less than 100ms, **Then** the score is flagged as invalid and not submitted to the leaderboard
4. **Given** a failure occurs, **When** I am returned to the home screen, **Then** I can immediately start a new game

---

### User Story 3 - View Leaderboard (Priority: P2)

As a player, I want to see how my reaction time compares to other players globally, so that I can compete and track my improvement over time.

**Why this priority**: Leaderboards create the competitive motivation that drives retention and replay value. The game is playable without it, but significantly less engaging.

**Independent Test**: Can be tested by viewing the leaderboard from the home screen and verifying Top 10 entries display correctly, sorted by fastest time.

**Acceptance Scenarios**:

1. **Given** I am on the home screen, **When** the screen loads, **Then** I see a "Daily Top 10" leaderboard showing nicknames and average reaction times
2. **Given** I complete a valid game, **When** my score is submitted successfully, **Then** I see my ranking on the leaderboard with my nickname highlighted
3. **Given** two players have identical average scores, **When** viewing the leaderboard, **Then** the player who achieved the score first is ranked higher
4. **Given** I want to see all-time records, **When** I toggle to "All-Time" view, **Then** I see the best scores across all time periods

---

### User Story 4 - Enter Nickname (Priority: P2)

As a player, I want to enter a nickname that appears on the leaderboard, so other players can identify my scores.

**Why this priority**: Required for leaderboard display, but the core game mechanics could theoretically work with anonymous play.

**Independent Test**: Can be tested by entering various nicknames (valid letters, invalid characters like numbers/spaces) and verifying validation behavior before game start.

**Acceptance Scenarios**:

1. **Given** I am on the home screen, **When** I enter a nickname with 1-15 letters (A-Z, a-z), **Then** the nickname is accepted and I can start the game
2. **Given** I am on the home screen, **When** I try to start without entering a nickname, **Then** I see a validation error and cannot proceed
3. **Given** I enter a nickname with numbers, spaces, or special characters, **When** I attempt to submit, **Then** the input is rejected with an appropriate message

---

### User Story 5 - Retro Arcade Experience (Priority: P3)

As a player, I want the visual and audio design to evoke 1980s arcade cabinets, so the game feels nostalgic and distinctive.

**Why this priority**: Important for brand identity and user delight, but the game is fully functional without the aesthetic polish.

**Independent Test**: Can be tested by verifying visual elements (black background, neon green/amber colors, scanline overlay, pixel fonts) and audio synthesis (8-bit square wave tones) match the retro arcade specification.

**Acceptance Scenarios**:

1. **Given** the game is running, **When** I view the screen, **Then** I see a deep black background (#000000), neon green active elements, amber/orange completed elements, and a subtle scanline overlay effect
2. **Given** a bar begins moving, **When** the stimulus occurs, **Then** a sharp 8-bit square wave tone plays (ascending arpeggio)
3. **Given** I fail a game, **When** the failure occurs, **Then** a low-frequency 8-bit buzz sound plays (descending pitch-bend)
4. **Given** active gameplay elements, **When** viewing the bars, **Then** they emit a soft neon glow effect simulating CRT phosphor persistence

---

### Edge Cases

- What happens when network connectivity is lost during score submission? → User is notified immediately of submission failure; no offline queueing. Score is lost and user must replay with connectivity.
- How does the system handle rapid repeated button presses? → Only the first tap during bar movement is registered; subsequent taps are ignored until the next bar's movement phase
- What if the user backgrounds the app mid-game? → Game is paused/invalidated and user returns to home screen
- How does the game behave on very slow devices where 60 FPS cannot be maintained? → A pre-game performance check warns users if their device may affect timing accuracy

## Requirements *(mandatory)*

### Functional Requirements

**Core Gameplay:**

- **FR-001**: System MUST display 6 vertical bar lanes arranged horizontally from left to right
- **FR-002**: System MUST process bars sequentially from Bar 1 (leftmost) to Bar 6 (rightmost)
- **FR-003**: Each bar MUST wait a random interval between 1.0 and 3.0 seconds before starting to move
- **FR-004**: Bars MUST grow from 0% to 100% height in exactly 2.0 seconds at constant linear velocity
- **FR-005**: System MUST capture reaction time from the instant movement begins to the instant the Stop button is pressed
- **FR-006**: System MUST calculate the mean average of all 6 reaction times with precision to 0.05 milliseconds

**User Input:**

- **FR-007**: The Stop button MUST span the full width of the screen (minus safety padding) in the bottom 15% of the viewport
- **FR-008**: System MUST accept only one tap per bar movement phase; subsequent taps MUST be ignored
- **FR-009**: The Stop button MUST include bottom padding to avoid interference with device gesture bars or browser chrome

**Fail States:**

- **FR-010**: System MUST end the game immediately if the Stop button is pressed before a bar begins moving (false start)
- **FR-011**: System MUST end the game immediately if a bar reaches 100% height without being stopped (timeout)
- **FR-012**: System MUST invalidate and reject scores with average reaction times below 100ms (inhuman speed detection)
- **FR-013**: Upon failure, system MUST play a distinct failure audio cue and display the failure reason

**Nickname & Identity:**

- **FR-014**: Users MUST enter a nickname (1-15 letters only, A-Z and a-z) before starting a game
- **FR-015**: System MUST validate nicknames and reject any non-letter characters (numbers, spaces, special characters)
- **FR-016**: Nickname entry MUST be mandatory; game cannot start without a valid nickname

**Leaderboard:**

- **FR-017**: System MUST display a "Daily Top 10" leaderboard on the home screen
- **FR-018**: System MUST support both "Daily" and "All-Time" leaderboard views
- **FR-019**: Leaderboard MUST be sorted by fastest average reaction time (ascending)
- **FR-020**: In case of tied scores, the player who achieved the score first MUST be ranked higher
- **FR-021**: System MUST limit score submissions to 10 attempts per minute per source, where source is identified by device fingerprint combined with IP address

**Visual & Audio:**

- **FR-022**: Background MUST be deep black (#000000) with charcoal gray grid structure
- **FR-023**: Active (moving) bars MUST be neon green with a soft glow effect
- **FR-024**: Completed (stopped) bars MUST be amber/orange
- **FR-025**: System MUST display a subtle scanline overlay effect across the game stage
- **FR-026**: Audio cues MUST be synthesized 8-bit square wave tones (not pre-recorded files) for zero latency
- **FR-027**: Movement start MUST trigger an ascending arpeggio sound (440Hz → 880Hz)
- **FR-028**: Failure MUST trigger a descending, dissonant buzz sound

**Layout & Orientation:**

- **FR-029**: Application MUST be locked to portrait orientation
- **FR-030**: Game stage MUST occupy the upper 85% of the screen; control zone MUST occupy the bottom 15%
- **FR-031**: On non-mobile devices, game container MUST maintain mobile proportions centered on screen

**System Health:**

- **FR-032**: System MUST verify leaderboard connectivity before allowing game start (health check). If check fails, the Start Game button MUST be disabled, leaderboard MUST display "Offline" status, and a retry option MUST be available
- **FR-033**: System MUST render gameplay at consistent 60 FPS to ensure timing accuracy

### Key Entities

- **GameSession**: Represents a single 6-bar playthrough; contains 6 individual reaction times, calculated average, timestamp, associated nickname, and validation status
- **ReactionRecord**: Individual bar result; contains bar number (1-6), reaction time in milliseconds, and success/failure status
- **Player**: Identified by nickname (not unique—multiple players may use the same nickname); no persistent identity or account system
- **LeaderboardEntry**: Nickname, average score, timestamp, validation flag; supports daily and all-time filtering

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can complete a full 6-bar game session in under 30 seconds (excluding random wait intervals)
- **SC-002**: 95% of reaction time measurements are accurate within ±5ms of true human reaction time
- **SC-003**: Players see their score and leaderboard ranking within 2 seconds of completing a game
- **SC-004**: At least 60% of players who start a game complete all 6 bars successfully (game difficulty balance)
- **SC-005**: Leaderboard displays Top 10 entries within 1 second of home screen load
- **SC-006**: Zero invalid scores (sub-100ms averages) appear on the public leaderboard
- **SC-007**: 90% of first-time users understand the game mechanics without external instruction (intuitive design)
- **SC-008**: Application maintains 60 FPS during gameplay on standard mobile devices (2020 or newer)
- **SC-009**: Audio feedback occurs within 16ms of visual stimulus (imperceptible latency)
- **SC-010**: Monthly hosting costs remain under $5 budget threshold

### Assumptions

- Users have modern mobile devices (2020+) capable of 60 FPS rendering
- Users have stable internet connectivity for leaderboard submission
- Standard web audio APIs provide sufficient latency for synthesized audio
- 100ms reaction time threshold is biologically sound for filtering inhuman/bot submissions
- Portrait mode lock is acceptable for all target users (no landscape support needed)
