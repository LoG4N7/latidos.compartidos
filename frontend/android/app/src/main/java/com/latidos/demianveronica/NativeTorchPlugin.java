package com.latidos.demianveronica;

import android.content.Context;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeTorch")
public class NativeTorchPlugin extends Plugin {
    private static final String TAG = "NativeTorch";
    private String activeTorchCameraId = null;

    @PluginMethod
    public void setTorch(PluginCall call) {
        boolean enable = call.getBoolean("enabled", true);
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        CameraManager cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
        if (cameraManager == null) {
            call.reject("CameraManager is unavailable");
            return;
        }

        try {
            if (!enable) {
                if (activeTorchCameraId != null) {
                    cameraManager.setTorchMode(activeTorchCameraId, false);
                    activeTorchCameraId = null;
                }
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("enabled", false);
                call.resolve(ret);
                return;
            }

            // Find rear camera with flash unit
            String[] cameraIds = cameraManager.getCameraIdList();
            for (String id : cameraIds) {
                CameraCharacteristics chars = cameraManager.getCameraCharacteristics(id);
                Boolean hasFlash = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                Integer facing = chars.get(CameraCharacteristics.LENS_FACING);

                if (hasFlash != null && hasFlash && facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    cameraManager.setTorchMode(id, true);
                    activeTorchCameraId = id;
                    Log.d(TAG, "Native torch enabled successfully on camera ID: " + id);
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("cameraId", id);
                    ret.put("enabled", true);
                    call.resolve(ret);
                    return;
                }
            }

            // Fallback: try any camera with flash
            for (String id : cameraIds) {
                CameraCharacteristics chars = cameraManager.getCameraCharacteristics(id);
                Boolean hasFlash = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                if (hasFlash != null && hasFlash) {
                    cameraManager.setTorchMode(id, true);
                    activeTorchCameraId = id;
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("cameraId", id);
                    ret.put("enabled", true);
                    call.resolve(ret);
                    return;
                }
            }

            call.reject("No camera with flash unit found on this device");
        } catch (CameraAccessException e) {
            Log.e(TAG, "CameraAccessException: " + e.getMessage());
            call.reject("CameraAccessException: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error: " + e.getMessage());
            call.reject("Error setting torch: " + e.getMessage());
        }
    }
}
