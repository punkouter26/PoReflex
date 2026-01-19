/**
 * Audio Synth for game sound effects
 * Uses Web Audio API for low-latency sound generation
 */

class AudioSynthClass {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  /**
   * Initialize the audio context (requires user interaction first)
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new AudioContext();
      this.isInitialized = true;
      console.log("AudioSynth initialized");
    } catch (error) {
      console.warn("Failed to initialize AudioContext:", error);
    }
  }

  /**
   * Resume audio context (required after user interaction)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * Play a beep sound when stop is pressed
   */
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

  /**
   * Play ascending arpeggio when bar starts moving
   */
  playAscendingArpeggio(): void {
    if (!this.audioContext) return;

    const notes = [262, 330, 392]; // C4, E4, G4
    const duration = 0.1;

    notes.forEach((freq, i) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.value = freq;
      oscillator.type = "sine";

      const startTime = this.audioContext!.currentTime + i * duration;
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  /**
   * Play failure buzz sound
   */
  playFailureBuzz(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 100; // Low frequency buzz
    oscillator.type = "sawtooth";

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.3
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  /**
   * Play success sound
   */
  playSuccessSound(): void {
    if (!this.audioContext) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const duration = 0.15;

    notes.forEach((freq, i) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.value = freq;
      oscillator.type = "sine";

      const startTime = this.audioContext!.currentTime + i * duration * 0.8;
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }
}

// Singleton instance
export const AudioSynth = new AudioSynthClass();
