import React, { useState } from 'react';
import { Sparkles, Download, CheckCircle2, X, AlertCircle } from 'lucide-react';
import type { AppVersionInfo } from '../types';
import { updateService, CURRENT_APP_VERSION } from '../services/updateService';
import { hapticsAudio } from '../utils/hapticsAudio';

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: AppVersionInfo | null;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  updateInfo,
  onClose
}) => {
  const [downloading, setDownloading] = useState<boolean>(false);

  if (!isOpen || !updateInfo) return null;

  const handleDownload = () => {
    setDownloading(true);
    hapticsAudio.vibrateSingleBeat(50);
    updateService.downloadAndInstall(updateInfo.apkDownloadUrl);

    // Keep feedback visible for 4 seconds
    setTimeout(() => {
      setDownloading(false);
    }, 4000);
  };

  const handleDismiss = () => {
    updateService.dismissUpdate(updateInfo.version);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="w-full max-w-md glass-panel-active rounded-3xl p-5 border border-rose-500/40 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header with Sparkle Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/60">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  ¡Actualización Disponible!
                </h3>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  v{updateInfo.version}
                </span>
              </div>
              <p className="text-xs text-rose-300/70">
                Versión actual: v{CURRENT_APP_VERSION}
              </p>
            </div>
          </div>

          {!updateInfo.isMandatory && (
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full text-rose-400 hover:text-white hover:bg-rose-900/40 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Update Title */}
        <div className="bg-black/50 p-3 rounded-2xl border border-rose-900/40">
          <h4 className="text-xs font-bold text-rose-200 mb-1">
            {updateInfo.title || 'Nuevas mejoras de Latidos Compartidos'}
          </h4>
          <ul className="space-y-1.5 text-[11px] text-rose-300/80">
            {updateInfo.releaseNotes.map((note, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">•</span>
                <span className="leading-snug">{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Installation Instructions */}
        <div className="bg-rose-950/30 p-3 rounded-xl border border-rose-800/40 text-[11px] text-rose-200/90 space-y-1.5">
          <div className="flex items-center space-x-1.5 font-bold text-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>¿Cómo se instala en 1 paso?</span>
          </div>
          <p>
            1. Toca el botón <strong>"Descargar e Instalar"</strong> abajo.
          </p>
          <p>
            2. Cuando se descargue el archivo <code>Latidos-Compartidos.apk</code>, toca la notificación de descarga en tu teléfono y presiona <strong>"Actualizar"</strong>.
          </p>
          <p className="text-[10px] text-rose-300/60 pt-0.5">
            ✨ No perderás tu configuración, datos ni la sala con tu pareja.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-rose-900/50 active:scale-95 transition flex items-center justify-center space-x-2 disabled:opacity-75"
          >
            {downloading ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-bounce" />
                <span>Iniciando descarga del APK...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>Descargar e Instalar Actualización</span>
              </>
            )}
          </button>

          {!updateInfo.isMandatory && (
            <button
              onClick={handleDismiss}
              className="w-full py-2 px-3 text-center text-xs text-rose-300/60 hover:text-rose-200 transition"
            >
              Recordármelo más tarde
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
