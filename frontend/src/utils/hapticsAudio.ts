/**
 * Haptic and Cardiac Audio Synthesizer Engine
 * Provides dual-layer sensory feedback:
 * 1. navigator.vibrate() hardware haptics for Android/supporting devices.
 * 2. Web Audio API synthesized low-frequency cardiac thumps ("lub-dub")
 *    especially vital for iOS Safari (which lacks navigator.vibrate).
 */

class HapticsAudioEngine {
  private hapticsEnabled: boolean = true;
  private audioEnabled: boolean = true;
  private audioCtx: AudioContext | null = null;
  private isAudioUnlocked: boolean = false;

  constructor() {
    // Restore preferences from localStorage
    const savedHaptics = localStorage.getItem('latidos_haptics_enabled');
    const savedAudio = localStorage.getItem('latidos_audio_enabled');
    
    this.hapticsEnabled = savedHaptics !== null ? savedHaptics === 'true' : true;
    this.audioEnabled = savedAudio !== null ? savedAudio === 'true' : true;
  }

  public isHapticActive(): boolean {
    return this.hapticsEnabled;
  }

  public isAudioActive(): boolean {
    return this.audioEnabled;
  }

  public isUnlocked(): boolean {
    return this.isAudioUnlocked;
  }

  public setHaptics(enabled: boolean): void {
    this.hapticsEnabled = enabled;
    localStorage.setItem('latidos_haptics_enabled', String(enabled));
  }

  public setAudio(enabled: boolean): void {
    this.audioEnabled = enabled;
    localStorage.setItem('latidos_audio_enabled', String(enabled));
    if (enabled) {
      this.initAudioContext();
    }
  }

  /**
   * Initializes or resumes the AudioContext on first user interaction
   */
  public initAudioContext(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.isAudioUnlocked = true;
    } catch (e) {
      console.warn('AudioContext initialization error:', e);
    }
  }

  /**
   * Double haptic pulse ("lub-dub") for continuous Smart Band 9 mode
   */
  public vibrateLubDub(): void {
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([60, 100, 40]);
      } catch (e) {
        // Fallback or ignore
      }
    }

    if (this.audioEnabled) {
      this.playCardiacThump(true);
    }
  }

  /**
   * Single haptic pulse (70ms) for real-time camera PPG systolic detection
   */
  public vibrateSingleBeat(durationMs: number = 70): void {
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch (e) {
        // Fallback or ignore
      }
    }

    if (this.audioEnabled) {
      this.playCardiacThump(false);
    }
  }

  /**
   * Synthesize an organic low-frequency heartbeat sound using Web Audio API
   */
  private playCardiacThump(isDoubleBeat: boolean = false): void {
    if (!this.audioCtx) {
      this.initAudioContext();
    }
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;

    const now = this.audioCtx.currentTime;

    // First sound: S1 ("Lub") - Mitral/Tricuspid closure (lower, deeper)
    this.synthesizePulse(now, 58, 0.14, 0.45);

    // Second sound: S2 ("Dub") - Aortic/Pulmonary closure (slightly higher, shorter)
    if (isDoubleBeat) {
      this.synthesizePulse(now + 0.16, 75, 0.11, 0.35);
    }
  }

  private synthesizePulse(startTime: number, frequency: number, duration: number, peakGain: number): void {
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      // Low-pass filter to make it muffled and warm like a stethoscope
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, startTime);

      // Pitch drop curve simulating ventricle contraction pressure wave
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      osc.frequency.exponentialRampToValueAtTime(32, startTime + duration);

      // Amplitude envelope
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Audio error safely ignored
    }
  }
}

export const hapticsAudio = new HapticsAudioEngine();
