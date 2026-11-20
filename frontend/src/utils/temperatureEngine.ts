import type { WeatherData } from '../types';

export class TemperatureEngine {
  private ambientTemp: number = 22.0; // Default comfortable ambient temp
  private weatherLoaded: boolean = false;
  private locationName: string = 'Ubicación de Pareja';
  private weatherCode: number = 0;
  
  // Smooth random walk state
  private noiseSeed: number = Math.random() * 1000;
  private currentTemp: number = 36.6;
  private targetTemp: number = 36.6;
  private lastUpdateTime: number = Date.now();

  constructor() {
    this.fetchAmbientWeather();
  }

  /**
   * Fetches real-time ambient temperature via Open-Meteo API
   */
  public async fetchAmbientWeather(): Promise<WeatherData> {
    try {
      let lat = -34.6037; // Default fallback coordinates (Buenos Aires)
      let lon = -58.3816;

      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 600000
            });
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          this.locationName = 'Local';
        } catch (geoErr) {
          // Keep default coordinates if user declines or on desktop
        }
      }

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.current) {
          this.ambientTemp = data.current.temperature_2m;
          this.weatherCode = data.current.weather_code;
          this.weatherLoaded = true;
        }
      }
    } catch (err) {
      console.warn('Open-Meteo weather fetch error:', err);
    }

    return {
      temperature: this.ambientTemp,
      weatherCode: this.weatherCode,
      locationName: this.locationName,
      isLoaded: this.weatherLoaded
    };
  }

  /**
   * Calculates realistic body temperature based on current BPM and ambient climate
   * Output guaranteed within human range: 36.1°C to 37.2°C
   */
  public calculateBodyTemperature(bpm: number): {
    celsius: number;
    formatted: string;
    ambientTemp: number;
    state: 'cool' | 'normal' | 'warm';
  } {
    const now = Date.now();
    const elapsedSec = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    // Base human resting core/skin balance
    let base = 36.5;

    // 1. BPM Factor
    // Resting (<65): cools down slightly (-0.15°C to -0.3°C)
    // Elevated (>95): warms up smoothly (+0.25°C to +0.55°C)
    let bpmDelta = 0;
    if (bpm > 95) {
      const intensity = Math.min((bpm - 95) / 50, 1); // 95 to 145 BPM
      bpmDelta = 0.25 + intensity * 0.35; // +0.25°C to +0.60°C
    } else if (bpm < 65) {
      const drop = Math.min((65 - bpm) / 25, 1); // 40 to 65 BPM
      bpmDelta = -(0.15 + drop * 0.2); // -0.15°C to -0.35°C
    } else {
      // Linear transition between 65 and 95
      bpmDelta = ((bpm - 65) / 30) * 0.25 - 0.1;
    }

    // 2. Weather Factor
    // Hot (>28°C) increases skin temp slightly (+0.15°C to +0.3°C)
    // Cold (<15°C) cools skin temp slightly (-0.15°C to -0.3°C)
    let weatherDelta = 0;
    if (this.ambientTemp > 28) {
      weatherDelta = Math.min((this.ambientTemp - 28) / 15, 1) * 0.3;
    } else if (this.ambientTemp < 15) {
      weatherDelta = -Math.min((15 - this.ambientTemp) / 20, 1) * 0.3;
    }

    // 3. Smooth Perlin-like pseudo-random micro-fluctuations (±0.07°C)
    const timeHarmonics = 
      Math.sin(now * 0.0003 + this.noiseSeed) * 0.04 +
      Math.cos(now * 0.00015 + this.noiseSeed * 1.5) * 0.03;

    // Target temperature calculation
    let calculatedTarget = base + bpmDelta + weatherDelta + timeHarmonics;

    // Clamp strictly to physiological range (36.1°C to 37.2°C)
    calculatedTarget = Math.max(36.1, Math.min(37.2, calculatedTarget));
    this.targetTemp = calculatedTarget;

    // Smooth exponential decay transition towards target
    const smoothingFactor = Math.min(elapsedSec * 0.3, 0.2);
    this.currentTemp += (this.targetTemp - this.currentTemp) * (smoothingFactor > 0 ? smoothingFactor : 0.05);

    // Classification
    let state: 'cool' | 'normal' | 'warm' = 'normal';
    if (this.currentTemp > 36.8) state = 'warm';
    else if (this.currentTemp < 36.4) state = 'cool';

    return {
      celsius: Number(this.currentTemp.toFixed(1)),
      formatted: `${this.currentTemp.toFixed(1)}°C`,
      ambientTemp: this.ambientTemp,
      state
    };
  }

  public getAmbient(): number {
    return this.ambientTemp;
  }
}

export const temperatureEngine = new TemperatureEngine();
