import type { AppVersionInfo } from '../types';

export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_VERSION_CODE = 1;

export class UpdateService {
  private lastChecked: number = 0;
  private cachedUpdate: AppVersionInfo | null = null;

  public async checkForUpdate(force: boolean = false): Promise<{
    hasUpdate: boolean;
    updateInfo: AppVersionInfo | null;
  }> {
    // Avoid spamming requests within 10 seconds unless forced
    const now = Date.now();
    if (!force && now - this.lastChecked < 10000 && this.cachedUpdate) {
      const hasUpdate = this.cachedUpdate.versionCode > CURRENT_VERSION_CODE;
      return { hasUpdate, updateInfo: this.cachedUpdate };
    }

    try {
      const serverUrl = localStorage.getItem('latidos_server_url') || '';
      const endpoint = serverUrl
        ? `${serverUrl.replace(/\/$/, '')}/api/version`
        : '/api/version';

      const res = await fetch(endpoint, {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const info: AppVersionInfo = await res.json();
      this.lastChecked = now;
      this.cachedUpdate = info;

      const hasUpdate = (info.versionCode > CURRENT_VERSION_CODE) || (info.version !== CURRENT_APP_VERSION && info.versionCode >= CURRENT_VERSION_CODE);

      // Check if user dismissed this version recently (within 18 hours), unless forced
      if (hasUpdate && !force) {
        const dismissedAt = Number(localStorage.getItem(`latidos_dismissed_v_${info.version}`) || 0);
        if (now - dismissedAt < 18 * 60 * 60 * 1000) {
          return { hasUpdate: false, updateInfo: info };
        }
      }

      return { hasUpdate, updateInfo: info };
    } catch (err) {
      console.warn('[UpdateService] No se pudo verificar versión remota:', err);
      return { hasUpdate: false, updateInfo: null };
    }
  }

  public dismissUpdate(version: string): void {
    localStorage.setItem(`latidos_dismissed_v_${version}`, String(Date.now()));
  }

  public downloadAndInstall(downloadUrl?: string): void {
    const targetUrl = downloadUrl || (
      (localStorage.getItem('latidos_server_url') || '').replace(/\/$/, '') + '/download/apk'
    ) || 'https://github.com/LoG4N7/latidos.compartidos/releases/latest/download/Latidos-Compartidos.apk';

    // On Capacitor / Android, opening in system browser triggers Android Package Installer
    try {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_system';
      link.rel = 'noopener noreferrer';
      link.setAttribute('download', 'Latidos-Compartidos.apk');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(targetUrl, '_blank');
    }
  }
}

export const updateService = new UpdateService();
