# PoReflex: Comprehensive Application Description

## Overview

PoReflex is a high-precision reaction time testing application designed to measure human reflexes with sub-millisecond accuracy. The application presents users with a visual stimulus in the form of ascending vertical bars and captures their reaction time when they stop each bar. Through six consecutive trials, the system builds a comprehensive profile of the player's reaction capabilities, calculating an average score that serves as their primary performance metric. The application is architected with resilience as a core principle, ensuring full functionality even when network connectivity is unavailable.

## Core Gameplay Mechanics

### Visual Stimulus System

The game employs a six-bar sequential testing mechanism displayed on a full-screen canvas utilizing hardware-accelerated rendering. Each bar progresses through a distinct state machine with four phases: ready, waiting, moving, and stopped. When a trial begins, the system enters a randomized waiting period between one and three seconds, preventing players from anticipating the stimulus and ensuring genuine reaction time measurement rather than pattern prediction.

Once the waiting period expires, the selected bar begins ascending from the bottom of the screen toward maximum height over a precisely calibrated two-second duration. This ascending motion serves as the visual stimulus to which players must react. The bar's progress is rendered at sixty frames per second, providing smooth animation and accurate visual feedback. Players must press the stop control before the bar reaches full height, with the exact timing of their input captured using high-precision performance timing APIs.

### Precision Timing Architecture

The application utilizes performance timing mechanisms capable of sub-millisecond precision, specifically achieving accuracy to within fifty microseconds (0.05 milliseconds). Each reaction is measured from the exact moment the bar begins its upward movement to the instant the player activates the stop control. This measurement is then rounded to the nearest 0.05 millisecond increment, providing consistent and scientifically valid timing data.

The timing system accounts for rendering latency and input lag by leveraging the browser's performance measurement APIs, which operate independently of frame rendering cycles. This ensures that variations in display refresh rates or temporary system performance fluctuations do not compromise measurement accuracy.

### Failure Conditions

The game implements strict failure conditions to maintain measurement integrity. If a player activates the stop control during the waiting phase before the bar begins moving, the system immediately fails the session with a "FALSE START" designation. This prevents users from gaming the system through anticipatory inputs.

Similarly, if the bar reaches maximum height before the player responds, the session terminates with a "TOO SLOW" failure. The application also monitors for tab visibility changes or window backgrounding during active trials. If the application loses focus during the waiting or moving phases, the session automatically fails to prevent timing manipulation through task switching.

## Audio Feedback System

The application incorporates a sophisticated audio synthesis engine built on the Web Audio API, generating real-time sound effects without requiring external audio file assets. This approach eliminates loading delays and provides precise temporal alignment between visual events and auditory feedback.

When a bar transitions from waiting to moving state, the system plays an ascending three-note arpeggio (C4, E4, G4) using sine wave oscillators. This auditory cue provides redundant stimulus information for players who may benefit from multi-modal input. Each successful stop action triggers a short square-wave beep at 880 Hz (A5 note), providing immediate confirmation of input registration.

Upon completing all six trials successfully, the application generates a celebratory four-note ascending chord progression (C5, E5, G5, C6), signaling achievement. Conversely, failure conditions trigger a distinctive low-frequency sawtooth waveform at 100 Hz, creating an unmistakable error tone that differentiates failure states from successful completions.

## Resilient Offline-First Architecture

### Local Storage Strategy

The application implements a comprehensive offline-first data persistence strategy, ensuring complete functionality regardless of network availability. All user scores, reaction time details, and nickname information are immediately persisted to browser local storage upon completion of a game session. This local persistence serves dual purposes: providing an offline gameplay experience and acting as a buffer against network failures during score submission.

When the backend API is unreachable, the application transparently switches to display locally stored scores in the leaderboard interface, maintaining the competitive experience even in degraded network conditions. Players receive clear visual indication of offline mode through status messaging, but gameplay remains uninterrupted.

### Score Synchronization

The system attempts to submit completed scores to the remote backend API, but treats remote submission as an enhancement rather than a requirement. Scores are first saved locally, then asynchronously transmitted to the server. If the transmission succeeds, the application navigates to the leaderboard with the submitted score highlighted. If transmission fails due to network issues or server unavailability, the navigation still proceeds, and the score remains available in local storage for potential future synchronization.

This approach ensures that network failures never result in lost game sessions or frustrated users unable to record their performance. The local storage maintains a complete history of all attempts, whether successfully synchronized with the server or remaining in a local-only state.

## Leaderboard System

### Dual Time-Period Rankings

The leaderboard component provides two distinct ranking views: daily scores and all-time records. The daily leaderboard resets at midnight UTC, creating a recurring competitive cycle that encourages regular engagement. Players can compete for daily supremacy while also working toward all-time record positions.

Both leaderboards display the top performers ranked by fastest average reaction time, with rank positions explicitly shown. The top three positions receive special visual treatment with gold, silver, and bronze designation classes, providing immediate recognition of elite performance.

### Score Highlighting and Feedback

When a player completes a game session and returns to the leaderboard view, their most recent submission receives visual highlighting if it appears in the current ranking view. This immediate feedback creates a satisfying connection between gameplay and competitive placement, helping players understand their performance relative to others.

The leaderboard component gracefully handles the transition between online and offline modes, adjusting its display labels to indicate whether scores are sourced from the remote API or local storage. In offline mode, the leaderboard tabs relabel from "Daily" and "All-Time" to "Local" and "Local Best," maintaining clarity about data sources.

## Input Validation and Security

### Nickname Requirements

Player nicknames must satisfy strict validation criteria designed to prevent abuse while allowing creative expression. Nicknames must contain between three and twenty characters, using only alphanumeric characters and underscores. This restriction prevents empty submissions, excessively long names that disrupt leaderboard layouts, and special characters that could enable injection attacks or display issues.

The nickname validation occurs both in the client interface (providing immediate feedback to users) and on the server API (enforcing security boundaries). Client-side validation uses real-time checking as users type, displaying validation status through visual indicators. Server-side validation operates as a defensive layer, rejecting malformed requests even if client validation is bypassed.

### Score Legitimacy Checks

The server implements multiple layers of fraud detection to maintain leaderboard integrity. Reaction times below one hundred milliseconds are flagged as suspicious, as human reaction times typically fall between 150 and 300 milliseconds for visual stimuli. While the system currently logs these suspicious entries, the validation framework is designed to support more sophisticated fraud prevention measures.

Each score submission must include exactly six individual reaction time measurements, corresponding to the six-bar gameplay sequence. The server validates that the submitted average correctly represents the mean of the six individual times, preventing manipulation of the aggregate score while submitting legitimate-appearing individual measurements.

## Rate Limiting and Abuse Prevention

The API implements per-client rate limiting to prevent automated submission attacks and leaderboard flooding. Each unique client identifier (derived from IP address and device fingerprint) is restricted to ten score submissions per minute. This limit allows legitimate rapid gameplay while preventing bulk automated submissions.

The rate limiting system maintains a sliding time window, ensuring that the restriction applies to any sixty-second period rather than resetting at fixed minute boundaries. When a client exceeds the rate limit, the server responds with HTTP 429 Too Many Requests status and a problem details payload explaining the restriction.

## Health Monitoring and Diagnostics

The application provides comprehensive health checking endpoints that validate connectivity to all dependent services, including the data storage backend. These health checks support both simple boolean health status and detailed component-level diagnostics, enabling both automated monitoring systems and manual troubleshooting.

The diagnostic endpoint exposes configuration values in a safe manner, masking sensitive information like connection strings and API keys while revealing non-sensitive settings that aid in debugging deployment issues. This careful balance between transparency and security helps operators diagnose configuration problems without exposing credentials.

## Visual Design and Accessibility

The game employs a retro arcade aesthetic with a dark background and bright neon green accents, creating high contrast that enhances visual stimulus clarity. The canvas rendering uses a subtle grid pattern that provides spatial reference without creating visual distraction.

Bar state is conveyed through multiple visual channels: inactive bars appear as dark gray outlines, moving bars glow with animated green fill and shadow effects, and stopped bars transition to orange to indicate completion. This multi-channel approach ensures that players with various forms of color perception can distinguish game states.

The interface dedicates eighty-five percent of viewport height to the game canvas, maximizing the visual stimulus area while reserving fifteen percent for controls. This proportion ensures that the bars are large enough to track visually while maintaining adequate space for the stop button and menu navigation.

## Score Display and Results

Upon successful completion of all six trials, the game overlays a results panel on the canvas showing the calculated average reaction time as the primary metric, displayed with two decimal places of precision. Below the average, the system presents all six individual reaction times in sequence, allowing players to identify their fastest and slowest responses.

The results panel provides a submit button that initiates the score submission process, communicating with the backend API and navigating to the leaderboard upon completion. If submission fails, the application still proceeds to the leaderboard to maintain flow continuity, with the score available in local storage.

## Progressive Enhancement Philosophy

The entire application is designed around progressive enhancement principles. Core gameplay functionality operates entirely in the browser with no server dependency. The backend API enhances the experience through persistent leaderboards and cross-device score synchronization, but its absence does not prevent game usage.

This architecture ensures that the application remains functional under various network conditions: full functionality during normal operation, graceful degradation to local-only mode during network outages, and automatic recovery when connectivity is restored. Users never encounter blocking errors or unavailable features due to temporary infrastructure issues.

The application represents a modern approach to web gaming where offline capability is treated as a feature rather than a failure mode, ensuring consistent user experience regardless of environmental conditions.
