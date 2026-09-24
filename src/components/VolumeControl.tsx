import React, { useRef } from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { playKeyStrokeSound } from '../utils/audio';

interface VolumeControlProps {
  volume: number; // 0.0 to 1.0
  soundOn: boolean;
  onVolumeChange: (newVolume: number) => void;
  onToggleSound: () => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  soundOn,
  onVolumeChange,
  onToggleSound,
}) => {
  const lastSoundPreviewRef = useRef<number>(0);

  const displayVolume = soundOn ? Math.round(volume * 100) : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value) / 100;
    onVolumeChange(newVol);

    // 拖曳時每隔 150ms 輕微發出一次敲擊聲作為即時音量回饋
    const now = Date.now();
    if (now - lastSoundPreviewRef.current > 150 && newVol > 0) {
      lastSoundPreviewRef.current = now;
      playKeyStrokeSound();
    }
  };

  return (
    <div
      id="volume-control-container"
      className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg bg-stone-900 border border-stone-800 hover:border-stone-700 transition-colors"
      title={`音量調整 (${displayVolume}%)`}
    >
      {/* 靜音 / 取消靜音快速切換鈕 */}
      <button
        id="btn-toggle-sound"
        type="button"
        onClick={onToggleSound}
        className={`p-0.5 rounded transition-colors focus:outline-none cursor-pointer ${
          displayVolume > 0
            ? 'text-amber-400 hover:text-amber-300'
            : 'text-stone-500 hover:text-stone-400'
        }`}
        title={displayVolume > 0 ? `音效開 (${displayVolume}%) - 點擊靜音` : '音效靜音 - 點擊恢復音量'}
        aria-label="音效開關"
      >
        {displayVolume === 0 ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : displayVolume < 40 ? (
          <Volume1 className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
      </button>

      {/* 音量滑桿 (0% - 100%) */}
      <input
        id="input-volume-slider"
        type="range"
        min="0"
        max="100"
        step="1"
        value={displayVolume}
        onChange={handleSliderChange}
        aria-label="調整遊戲音量"
        className="w-12 sm:w-16 md:w-20 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
      />

      {/* 音量百分比標籤 */}
      <span className="text-[10px] font-mono text-stone-400 min-w-[24px] sm:min-w-[28px] text-right select-none">
        {displayVolume}%
      </span>
    </div>
  );
};
