/**
 * PoReflex Audio Synthesizer
 * 8-bit style audio synthesis using Web Audio API.
 * Zero-latency audio cues with square wave oscillators.
 */

const AudioSynth = (function() {
  'use strict';

  let audioContext = null;
  let isInitialized = false;

  /**
   * Initialize the audio context.
   * Must be called after user interaction (browser autoplay policy).
   */
  function init() {
    if (isInitialized) return true;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      isInitialized = true;
      console.log('AudioSynth initialized');
      return true;
    } catch (e) {
      console.error('Failed to initialize Web Audio API:', e);
      return false;
    }
  }

  /**
   * Resume audio context (required after user interaction).
   */
  async function resume() {
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  }

  /**
   * Create a square wave oscillator (8-bit style).
   */
  function createSquareOscillator(frequency, duration, gain = 0.3) {
    if (!audioContext) {
      init();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);

    return oscillator;
  }

  /**
   * Play ascending arpeggio (440Hz → 880Hz) on bar movement start.
   * FR-027: Movement start MUST trigger an ascending arpeggio sound.
   */
  function playAscendingArpeggio() {
    if (!audioContext) {
      init();
    }

    resume();

    // Quick ascending notes: C5 → E5 → G5 → C6 (roughly)
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    const noteDuration = 0.08;
    const noteGap = 0.05;

    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        createSquareOscillator(freq, noteDuration, 0.25);
      }, index * (noteDuration + noteGap) * 1000);
    });
  }

  /**
   * Play descending failure buzz sound.
   * FR-028: Failure MUST trigger a descending, dissonant buzz sound.
   */
  function playFailureBuzz() {
    if (!audioContext) {
      init();
    }

    resume();

    // Descending dissonant tones
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sawtooth'; // Harsher sound for failure
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Add a second dissonant tone
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(150, audioContext.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);

      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      osc2.connect(gain2);
      gain2.connect(audioContext.destination);

      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.3);
    }, 100);
  }

  /**
   * Play success/completion chime.
   */
  function playSuccessChime() {
    if (!audioContext) {
      init();
    }

    resume();

    // Major chord arpeggio
    const frequencies = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    const noteDuration = 0.15;
    const noteGap = 0.08;

    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        createSquareOscillator(freq, noteDuration, 0.2);
      }, index * (noteDuration + noteGap) * 1000);
    });
  }

  /**
   * Play bar stop confirmation beep.
   */
  function playStopBeep() {
    if (!audioContext) {
      init();
    }

    resume();
    createSquareOscillator(880, 0.05, 0.2);
  }

  // Public API
  return {
    init,
    resume,
    playAscendingArpeggio,
    playFailureBuzz,
    playSuccessChime,
    playStopBeep
  };
})();

// Make available globally for Blazor interop
window.AudioSynth = AudioSynth;
