/**
 * Hardware Torch / Flashlight Helper
 * Controls camera LED flash via WebRTC MediaStreamTrack constraints
 * Designed to be 100% fail-safe across Android (Samsung One UI 6, MIUI, etc.) and browsers
 */

export async function setHardwareTorch(enabled: boolean, videoTrack?: MediaStreamTrack | null): Promise<boolean> {
  if (!videoTrack) return false;

  try {
    const capabilities = (videoTrack as any).getCapabilities?.() || {};
    
    // Check if torch is supported on this track
    if ('torch' in capabilities || capabilities.torch !== undefined) {
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: enabled }]
      });
      return true;
    }

    // Try applying constraint directly as fallback
    await (videoTrack as any).applyConstraints({
      advanced: [{ torch: enabled }]
    });
    return true;
  } catch (e) {
    console.warn('[Torch] Unable to set torch constraint on current track:', e);
    return false;
  }
}
