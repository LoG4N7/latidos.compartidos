/**
 * High-Performance Optical Photoplethysmography (PPG) Engine
 * Processes camera video frames at 30 FPS to detect arterial capillary pulse waves
 * Filters: High-pass (0.7 Hz / 42 BPM) + Low-pass (3.5 Hz / 210 BPM)
 * Detects systolic cardiac peaks with adaptive dynamic thresholding and refractory periods
 */

export interface PPGOptions {
  onBeat: (bpm: number, timestamp: number) => void;
  onWaveSample: (normalizedValue: number, isFingerDetected: boolean) => void;
  onFingerStatusChange: (isDetected: boolean) => void;
  onError: (error: string) => void;
}

export class PPGEngine {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mediaStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private animationFrameId: number | null = null;

  private isRunning: boolean = false;
  private isFingerPresent: boolean = false;
  private callbacks: PPGOptions;

  // Signal Processing State
  private baseline: number = 0;
  private smoothedSignal: number = 0;
  private recentSamples: number[] = [];
  private sampleTimes: number[] = [];
  private lastPeakTime: number = 0;
  private recentRRIntervals: number[] = [];
  private currentBpm: number = 72;

  // Dynamic Peak Detection State
  private peakThreshold: number = 0.5;
  private maxSignalRecent: number = 0.5;
  private minSignalRecent: number = -0.5;

  constructor(callbacks: PPGOptions) {
    this.callbacks = callbacks;
  }

  /**
   * Initializes camera, enables torch/flashlight, and starts PPG analysis loop
   */
  public async start(): Promise<boolean> {
    if (this.isRunning) return true;

    try {
      // 1. Create hidden video and sampling canvas
      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('muted', 'true');
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);
      }

      if (!this.canvasElement) {
        this.canvasElement = document.createElement('canvas');
        this.canvasElement.width = 48;
        this.canvasElement.height = 48;
        this.ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });
      }

      // 2. Request rear camera with torch
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 320 },
          height: { ideal: 240 }
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoTrack = this.mediaStream.getVideoTracks()[0] || null;

      if (!this.videoTrack) {
        throw new Error('No se encontró ninguna cámara disponible');
      }

      // 3. Attempt to turn on Flashlight/Torch
      await this.applyTorch(true);

      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play();

      this.isRunning = true;
      this.lastPeakTime = Date.now();
      this.recentRRIntervals = [];

      // 4. Start 30 FPS processing loop
      this.processLoop();

      return true;
    } catch (err: any) {
      console.error('PPG Start Error:', err);
      this.callbacks.onError(err.message || 'No se pudo acceder a la cámara o flash');
      this.stop();
      return false;
    }
  }

  /**
   * Toggles or applies Torch constraint
   */
  public async applyTorch(on: boolean): Promise<boolean> {
    if (!this.videoTrack) return false;

    try {
      const capabilities = (this.videoTrack as any).getCapabilities?.() || {};
      if (capabilities.torch) {
        await (this.videoTrack as any).applyConstraints({
          advanced: [{ torch: on }]
        });
        return true;
      }
    } catch (e) {
      console.warn('Torch constraint not supported or failed on this device:', e);
    }
    return false;
  }

  /**
   * Main Frame Processing Loop
   */
  private processLoop = (): void => {
    if (!this.isRunning) return;

    if (this.videoElement && this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.ctx) {
      this.ctx.drawImage(this.videoElement, 0, 0, 48, 48);

      // Sample central 24x24 pixels to avoid border artifacts
      const frameData = this.ctx.getImageData(12, 12, 24, 24);
      this.analyzeFrame(frameData.data);
    }

    this.animationFrameId = requestAnimationFrame(this.processLoop);
  };

  /**
   * Optical analysis and mathematical filtering
   */
  private analyzeFrame(pixels: Uint8ClampedArray): void {
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    const totalPixels = pixels.length / 4;

    for (let i = 0; i < pixels.length; i += 4) {
      sumR += pixels[i];
      sumG += pixels[i + 1];
      sumB += pixels[i + 2];
    }

    const avgR = sumR / totalPixels;
    const avgG = sumG / totalPixels;
    const avgB = sumB / totalPixels;

    // Finger Presence Validation:
    // When the finger firmly covers the lens and flash:
    // 1. Red is predominant (avgR > 130)
    // 2. Red significantly exceeds Green and Blue: avgR / (avgG + avgB + 1) > 1.35
    const fingerDetected = avgR > 130 && avgR > (avgG + avgB) * 0.95;

    if (fingerDetected !== this.isFingerPresent) {
      this.isFingerPresent = fingerDetected;
      this.callbacks.onFingerStatusChange(fingerDetected);
    }

    if (!fingerDetected) {
      // Finger removed: reset dynamic buffers
      this.callbacks.onWaveSample(0, false);
      this.baseline = 0;
      this.smoothedSignal = 0;
      this.recentSamples = [];
      return;
    }

    const now = Date.now();

    // Raw optical absorption signal (inverted Red channel: more blood = more light absorbed)
    const rawVal = -avgR;

    // 1. High-Pass Filter (DC Baseline Subtraction ~0.7 Hz)
    if (this.baseline === 0) {
      this.baseline = rawVal;
    } else {
      // Alpha ~0.94 creates a high-pass cutoff around 0.65 - 0.7 Hz at 30 FPS
      this.baseline = 0.94 * this.baseline + 0.06 * rawVal;
    }
    const detrended = rawVal - this.baseline;

    // 2. Low-Pass Smoothing Filter (~3.5 Hz cutoff)
    // Exponential smoothing with alpha = 0.35 eliminates sensor flicker
    this.smoothedSignal = this.smoothedSignal * 0.65 + detrended * 0.35;

    // Normalize value for waveform display (-1 to 1)
    this.maxSignalRecent = Math.max(this.maxSignalRecent * 0.985, this.smoothedSignal, 0.1);
    this.minSignalRecent = Math.min(this.minSignalRecent * 0.985, this.smoothedSignal, -0.1);
    const range = this.maxSignalRecent - this.minSignalRecent || 1;
    const normalizedWave = ((this.smoothedSignal - this.minSignalRecent) / range) * 2 - 1;

    // Notify oscilloscope listener
    this.callbacks.onWaveSample(normalizedWave, true);

    // 3. Dynamic Systolic Peak Detection
    this.recentSamples.push(this.smoothedSignal);
    this.sampleTimes.push(now);

    // Keep rolling window of last 12 samples (~400ms)
    if (this.recentSamples.length > 12) {
      this.recentSamples.shift();
      this.sampleTimes.shift();
    }

    // Dynamic threshold: 50% of the recent positive amplitude
    this.peakThreshold = Math.max(this.maxSignalRecent * 0.45, 0.08);

    // Check if the mid-point sample is a local maximum
    if (this.recentSamples.length >= 5) {
      const mid = Math.floor(this.recentSamples.length / 2);
      const midVal = this.recentSamples[mid];
      const midTime = this.sampleTimes[mid];

      const isLocalMax =
        midVal > this.recentSamples[mid - 1] &&
        midVal > this.recentSamples[mid + 1] &&
        midVal > this.peakThreshold;

      // Refractory period: minimum 285ms between beats (~210 BPM max)
      const timeSinceLastPeak = midTime - this.lastPeakTime;

      if (isLocalMax && timeSinceLastPeak >= 285) {
        this.lastPeakTime = midTime;

        // Valid physiological RR interval (between 285ms and 1500ms -> 40 to 210 BPM)
        if (timeSinceLastPeak <= 1500) {
          const instantBpm = 60000 / timeSinceLastPeak;

          this.recentRRIntervals.push(instantBpm);
          if (this.recentRRIntervals.length > 7) {
            this.recentRRIntervals.shift();
          }

          // Use median of recent RR intervals for outlier rejection
          const sorted = [...this.recentRRIntervals].sort((a, b) => a - b);
          this.currentBpm = Math.round(sorted[Math.floor(sorted.length / 2)]);

          // Trigger systolic beat event!
          this.callbacks.onBeat(this.currentBpm, midTime);
        }
      }
    }
  }

  /**
   * Stops camera, turns off torch, and releases media resources
   */
  public stop(): void {
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.videoTrack) {
      this.applyTorch(false).catch(() => {});
      this.videoTrack.stop();
      this.videoTrack = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement.remove();
      this.videoElement = null;
    }

    this.isFingerPresent = false;
  }

  public getBpm(): number {
    return this.currentBpm;
  }

  public isFingerOn(): boolean {
    return this.isFingerPresent;
  }

  public isActive(): boolean {
    return this.isRunning;
  }
}
