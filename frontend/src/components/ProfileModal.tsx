import React, { useState } from 'react';
import { Lock, Heart, Sparkles } from 'lucide-react';
import type { UserProfile } from '../types';
import { hapticsAudio } from '../utils/hapticsAudio';

interface ProfileModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  currentPin: string;
  onSave: (user: UserProfile, pin: string) => void;
  onClose?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  currentUser,
  currentPin,
  onSave,
  onClose
}) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile>(currentUser);
  const [pin, setPin] = useState<string>(currentPin || '1402');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim() || '1402';
    hapticsAudio.vibrateSingleBeat(50);
    onSave(selectedUser, cleanPin);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-sm glass-panel-active rounded-2xl p-6 border border-rose-500/40 text-center animate-romantic-glow">
        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-900/50 mb-3">
          <Heart className="w-7 h-7 fill-white" />
        </div>

        <h2 className="text-xl font-bold text-white tracking-wide">
          Latidos Compartidos
        </h2>
        <p className="text-xs text-rose-300/80 mt-1 mb-5">
          Espacio íntimo para Demian & Verónica
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-rose-200 mb-2">
              ¿Quién está usando este teléfono?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedUser('Demian');
                  hapticsAudio.vibrateSingleBeat(30);
                }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center transition active:scale-95 ${
                  selectedUser === 'Demian'
                    ? 'bg-rose-950/80 border-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                    : 'bg-black/50 border-rose-900/30 text-rose-300/70 hover:border-rose-700/50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-rose-700/60 flex items-center justify-center text-xs font-bold text-white mb-1">
                  D
                </div>
                <span className="text-xs font-bold">Soy Demian</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedUser('Verónica');
                  hapticsAudio.vibrateSingleBeat(30);
                }}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center transition active:scale-95 ${
                  selectedUser === 'Verónica'
                    ? 'bg-purple-950/80 border-purple-400 text-white shadow-[0_0_15px_rgba(192,132,252,0.4)]'
                    : 'bg-black/50 border-rose-900/30 text-rose-300/70 hover:border-purple-700/50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-purple-700/60 flex items-center justify-center text-xs font-bold text-white mb-1">
                  V
                </div>
                <span className="text-xs font-bold">Soy Verónica</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-200 mb-1 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Código PIN de Pareja:</span>
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="1402"
              maxLength={10}
              className="w-full bg-black/60 border border-rose-900/50 rounded-xl px-3.5 py-2.5 text-center text-sm text-white font-mono tracking-widest focus:outline-none focus:border-rose-400"
            />
            <p className="mt-1 text-[10px] text-rose-300/60 text-center">
              Ambos deben usar el mismo código para sincronizarse
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-rose-600 via-rose-500 to-purple-600 text-white hover:brightness-110 active:scale-95 transition shadow-lg shadow-rose-950/50 flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4 text-rose-200" />
            <span>Entrar a Nuestro Espacio</span>
          </button>
        </form>
      </div>
    </div>
  );
};
