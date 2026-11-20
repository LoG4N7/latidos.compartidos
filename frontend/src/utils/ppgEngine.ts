import { setHardwareTorch } from './nativeTorch';

/**
 * High-Performance Optical Photoplethysmography (PPG) Engine
 * Processes camera video frames at 30 FPS to detect arterial capillary pulse waves
 * Filters: High-pass (0.7 Hz / 42 BPM) + Low-pass (3.5 Hz / 210 BPM)
 * Detects systolic cardiac peaks with adaptive dynamic thresholding and refractory periods
 * Compatible with Samsung Galaxy (One UI 6 / Android 14) and multi-camera devices
 */

export interface PPGOptions {
  onBeat: (bpm: number, timestamp: number) => void;
  onWaveSample: (normalizedValue: number, isFingerDetected: boolean) => void;
  onFingerStatusChange: (isDetected: boolean) => void;
  onError: (error: string) => void;
  onLightLevel?: (brightness: number, redRatio: number) => void;
}

export class PPGEngine {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mediaStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private animationFrameId: number | null = null;
  private torchRetryTimer: any = null;

  private isRunning: boolean = false;
  private isFingerPresent: boolean = false;
  private isTorchOn: boolean = false;
  private currentDeviceId: string | null = null;
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
  private maxSignalRecent: number = 0.5;
  private minSignalRecent: number = -0.5;

  constructor(callbacks: PPGOptions) {
    this.callbacks = callbacks;
  }

  /**
   * Returns list of video input devices
   */
  public async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch (e) {
      return [];
    }
  }

  /**
   * Initializes camera, enables torch/flashlight, and starts PPG analysis loop
   */
  public async start(deviceId?: string): Promise<boolean> {
    if (this.isRunning && !deviceId) return true;
    if (this.isRunning && deviceId) {
      this.stop();
    }

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

      this.currentDeviceId = deviceId || null;

      // 2. Request rear camera constraints
      let videoConstraints: MediaTrackConstraints;
      if (deviceId) {
        videoConstraints = {
          deviceId: { exact: deviceId },
          width: { ideal: 320 },
          height: { ideal: 240 }
        };
      } else {
        // Find best rear camera (prefer main lens over ultra-wide/macro on Samsung)
        const allCameras = await this.getAvailableCameras();
        const backCameras = allCameras.filter(c => {
          const label = c.label.toLowerCase();
          return !label.includes('front') && !label.includes('selfie') && !label.includes('delantera');
        });

        // Choose camera with 'back 0', 'main', or first back camera
        let preferredCamera = backCameras.find(c => {
          const l = c.label.toLowerCase();
          return l.includes('0') || l.includes('main') || l.includes('principal');
        }) || backCameras[0];

        if (preferredCamera && preferredCamera.deviceId) {
          videoConstraints = {
            deviceId: { exact: preferredCamera.deviceId },
            width: { ideal: 320 },
            height: { ideal: 240 }
          };
          this.currentDeviceId = preferredCamera.deviceId;
        } else {
          videoConstraints = {
            facingMode: { ideal: 'environment' },
            width: { ideal: 320 },
            height: { ideal: 240 }
          };
        }
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: videoConstraints
      });

      this.videoTrack = this.mediaStream.getVideoTracks()[0] || null;

      if (!this.videoTrack) {
        throw new Error('No se encontró ninguna cámara disponible');
      }

      // Attach stream to hidden video
      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play();

      this.isRunning = true;
      this.lastPeakTime = Date.now();
      this.recentRRIntervals = [];

      // 3. Hardware Torch activation (Native Android + WebRTC)
      // Samsung One UI 6 requires applying torch after video starts streaming
      await this.applyTorch(true);
      this.torchRetryTimer = setTimeout(() => {
        if (this.isRunning) {
          this.applyTorch(true);
        }
      }, 350);

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
   * Toggles or applies Torch constraint (Hardware level on Android + WebRTC)
   */
  public async applyTorch(on: boolean): Promise<boolean> {
    this.isTorchOn = on;
    try {
      const ok = await setHardwareTorch(on, this.videoTrack);
      return ok;
    } catch (e) {
      console.warn('Torch activation note:', e);
      return false;
    }
  }

  public toggleTorch(): Promise<boolean> {
    return this.applyTorch(!this.isTorchOn);
  }

  public isTorchActive(): boolean {
    return this.isTorchOn;
  }

  public getCurrentDeviceId(): string | null {
    return this.currentDeviceId;
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
   * Optimized for biological capillary red absorption
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

    // Optical Hemoglobin Ratio:
    // Capillary blood strongly absorbs green/blue light (500-600nm) and reflects/transmits red light (>650nm)
    const redRatio = avgR / (avgG + avgB + 1);
    if (this.callbacks.onLightLevel) {
      this.callbacks.onLightLevel(Math.round(avgR), Math.round(redRatio * 100) / 100);
    }

    // Finger Presence Validation:
    // 1. Adequate brightness from flash/ambient light: avgR > 35
    // 2. Clear red dominance: redRatio > 1.15 OR (avgR > 60 and avgR > avgG * 1.2)
    const fingerDetected = avgR > 35 && (redRatio > 1.15 || (avgR > 60 && avgR > avgG * 1.2));

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

    // Raw optical absorption signal (inverted Red channel: systolic pulse absorbs more light)
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

    // Dynamic threshold: 50% of recent amplitude
    const threshold = this.maxSignalRecent * 0.5;

    // Refractory period: human heart cannot beat faster than 220 BPM (272 ms minimum interval)
    const timeSinceLastPeak = now - this.lastPeakTime;

    if (this.recentSamples.length >= 5 && timeSinceLastPeak > 280) {
      const midIdx = Math.floor(this.recentSamples.length / 2);
      const midVal = this.recentSamples[midIdx];

      // Local maximum check
      let isLocalPeak = true;
      for (let i = 0; i < this.recentSamples.length; i++) {
        if (i !== midIdx && this.recentSamples[i] >= midVal) {
          isLocalPeak = false;
          break;
        }
      }

      if (isLocalPeak && midVal > threshold) {
        const peakTime = this.sampleTimes[midIdx];
        const rr = peakTime - this.lastPeakTime;
        this.lastPeakTime = peakTime;

        // Valid physiological RR interval: 280ms (214 BPM) to 1500ms (40 BPM)
        if (rr >= 280 && rr <= 1500) {
          this.recentRRIntervals.push(rr);
          if (this.recentRRIntervals.length > 5) {
            this.recentRRIntervals.shift();
          }

          // Weighted median / average filter for smooth BPM
          const sorted = [...this.recentRRIntervals].sort((a, b) => a - b);
          const medianRR = sorted[Math.floor(sorted.length / 2)];
          const instantBpm = Math.round(60000 / medianRR);

          if (instantBpm >= 42 && instantBpm <= 200) {
            this.currentBpm = instantBpm;
            this.callbacks.onBeat(instantBpm, peakTime);
          }
        }
      }
    }
  }

  /**
   * Stops processing, releases camera hardware, and turns off flashlight
   */
  public stop(): void {
    this.isRunning = false;

    if (this.torchRetryTimer) {
      clearTimeout(this.torchRetryTimer);
      this.torchRetryTimer = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Turn off hardware flashlight immediately
    this.applyTorch(false).catch(() => {});

    if (this.videoTrack) {
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
