/**
 * Screen Wake Lock API manager
 * Keeps smartphone screens awake during intimate heartbeat sessions
 */

class WakeLockManager {
  private wakeLockSentinel: any = null;
  private isRequested: boolean = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (this.isRequested && document.visibilityState === 'visible') {
          this.request();
        }
      });
    }
  }

  public async request(): Promise<boolean> {
    this.isRequested = true;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
        return true;
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
        return false;
      }
    }
    return false;
  }

  public release(): void {
    this.isRequested = false;
    if (this.wakeLockSentinel) {
      this.wakeLockSentinel.release().catch(() => {});
      this.wakeLockSentinel = null;
    }
  }

  public isActive(): boolean {
    return this.wakeLockSentinel !== null && !this.wakeLockSentinel.released;
  }
}

export const wakeLock = new WakeLockManager();
