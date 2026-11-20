import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeTorchPlugin {
  setTorch(options: { enabled: boolean }): Promise<{ success: boolean; cameraId?: string; enabled: boolean }>;
}

const NativeTorch = registerPlugin<NativeTorchPlugin>('NativeTorch');

export async function setHardwareTorch(enabled: boolean, videoTrack?: MediaStreamTrack | null): Promise<boolean> {
  let nativeSuccess = false;

  // 1. If running as native Android app (Capacitor), use native CameraManager torch
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeTorch.setTorch({ enabled });
      if (res && res.success) {
        nativeSuccess = true;
        console.log('[NativeTorch] Flashlight hardware set to:', enabled);
      }
    } catch (err) {
      console.warn('[NativeTorch] Native setTorch error:', err);
    }
  }

  // 2. Also apply WebRTC track torch constraint
  if (videoTrack) {
    try {
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: enabled }]
      });
      return true;
    } catch (e) {
      // Ignore WebRTC constraint error if native already worked
    }
  }

  return nativeSuccess;
}
