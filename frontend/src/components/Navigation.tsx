import React from 'react';
import { Watch, Fingerprint, Settings2 } from 'lucide-react';
import { hapticsAudio } from '../utils/hapticsAudio';

export type ActiveTab = 'band' | 'ppg' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab
}) => {
  const handleSelect = (tab: ActiveTab) => {
    if (tab !== activeTab) {
      hapticsAudio.vibrateSingleBeat(25);
      onChangeTab(tab);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 py-2.5 bg-black/85 backdrop-blur-xl border-t border-rose-950/60 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
        {/* Tab 1: Band Module */}
        <button
          onClick={() => handleSelect('band')}
          className={`py-2 px-3 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${
            activeTab === 'band'
              ? 'bg-rose-950/80 text-rose-200 border border-rose-600/50 shadow-[0_0_15px_rgba(225,29,72,0.35)]'
              : 'text-rose-300/60 hover:text-rose-200'
          }`}
        >
          <Watch className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-semibold tracking-wide">
            Mi Banda 9
          </span>
        </button>

        {/* Tab 2: Camera PPG Module */}
        <button
          onClick={() => handleSelect('ppg')}
          className={`py-2 px-3 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 relative ${
            activeTab === 'ppg'
              ? 'bg-purple-950/80 text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(192,132,252,0.35)]'
              : 'text-rose-300/60 hover:text-rose-200'
          }`}
        >
          <Fingerprint className="w-5 h-5 mb-0.5 text-purple-400" />
          <span className="text-[11px] font-semibold tracking-wide">
            Cámara PPG
          </span>
          <span className="absolute -top-1 right-3 px-1.5 py-0.2 rounded-full bg-rose-600 text-[9px] font-bold text-white shadow">
            En Vivo
          </span>
        </button>

        {/* Tab 3: Settings & PIN */}
        <button
          onClick={() => handleSelect('settings')}
          className={`py-2 px-3 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${
            activeTab === 'settings'
              ? 'bg-rose-950/80 text-rose-200 border border-rose-600/50 shadow-[0_0_15px_rgba(225,29,72,0.35)]'
              : 'text-rose-300/60 hover:text-rose-200'
          }`}
        >
          <Settings2 className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-semibold tracking-wide">
            Ajustes / PIN
          </span>
        </button>
      </div>
    </nav>
  );
};
