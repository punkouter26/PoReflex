/**
 * Audio Synth for game sound effects.
 * Uses Web Audio API for low-latency sound generation.
 *
 * Pattern: Singleton — single AudioContext shared across the app lifetime.
 */

class AudioSynthClass {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  /** Initialize the audio context (requires prior user interaction). */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new AudioContext();
      this.isInitialized = true;
      console.log("[audio] AudioSynth initialized");
    } catch (error) {
      console.warn("[audio] Failed to initialize AudioContext:", error);
    }
  }

  /** Resume a suspended audio context after user gesture. */
  async resume(): Promise<void> {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /** Short beep when stop is pressed. */
  playStopBeep(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 880; // A5
    oscillator.type = "square";

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.1
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  /** Ascending arpeggio when bar starts moving. */
  playAscendingArpeggio(): void {
    if (!this.audioContext) return;

    const notes = [262, 330, 392]; // C4, E4, G4
    const duration = 0.1;

    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.frequency.value = freq;
      osc.type = "sine";

      const startTime = this.audioContext!.currentTime + i * duration;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /** Low-frequency buzz on failure. */
  playFailureBuzz(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 100;
    oscillator.type = "sawtooth";

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.3
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  /** Celebratory ascending chord on success. */
  playSuccessSound(): void {
    if (!this.audioContext) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const duration = 0.15;

    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.frequency.value = freq;
      osc.type = "sine";

      const startTime = this.audioContext!.currentTime + i * duration * 0.8;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
}

/** Global singleton instance. */
export const AudioSynth = new AudioSynthClass();
