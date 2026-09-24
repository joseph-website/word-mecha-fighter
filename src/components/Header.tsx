import React from 'react';
import { Trophy, BookOpen, HelpCircle } from 'lucide-react';
import { VolumeControl } from './VolumeControl';

interface HeaderProps {
  soundOn: boolean;
  volume: number;
  onVolumeChange: (val: number) => void;
  onToggleSound: () => void;
  onOpenLeaderboard: () => void;
  onOpenQuestionBank: () => void;
  onOpenInstructions: () => void;
  onGoHome: () => void;
  isPlaying: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  soundOn,
  volume,
  onVolumeChange,
  onToggleSound,
  onOpenLeaderboard,
  onOpenQuestionBank,
  onOpenInstructions,
  onGoHome,
  isPlaying,
}) => {
  return (
    <header
      id="app-header"
      className="w-full border-b border-stone-800 bg-stone-950/90 backdrop-blur-md sticky top-0 z-40 transition-colors shrink-0"
    >
      <div className="max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-4 h-11 sm:h-12 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <button
          id="btn-brand-home"
          onClick={onGoHome}
          className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none cursor-pointer"
          title="回首頁"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <span className="font-black text-sm sm:text-base leading-none select-none">字</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-base text-stone-100 group-hover:text-amber-400 transition-colors">
                打字機動戰士
              </span>
              <span className="hidden sm:inline-flex items-center text-[9px] uppercase font-semibold tracking-wider px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                SHOOTER
              </span>
            </div>
            <p className="text-[10px] text-stone-400 font-sans hidden sm:block leading-tight">
              妙語如珠 · 例不虛發
            </p>
          </div>
        </button>

        {/* Global Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Instructions Button */}
          <button
            id="btn-open-instructions"
            onClick={onOpenInstructions}
            className="px-2 py-1 sm:px-2.5 sm:py-1 text-xs font-medium rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
            title="遊戲說明與操作指南"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">說明</span>
          </button>

          {/* Volume Control (Slider + Mute Toggle) */}
          <VolumeControl
            volume={volume}
            soundOn={soundOn}
            onVolumeChange={onVolumeChange}
            onToggleSound={onToggleSound}
          />

          {/* Question Bank Manager */}
          <button
            id="btn-open-question-bank"
            onClick={onOpenQuestionBank}
            className="px-2 py-1 sm:px-2.5 sm:py-1 text-xs font-medium rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
            title="編輯題庫"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">編輯題庫</span>
          </button>

          {/* Personal Records Button */}
          <button
            id="btn-open-leaderboard"
            onClick={onOpenLeaderboard}
            className="px-2 py-1 sm:px-2.5 sm:py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all flex items-center gap-1 shadow-sm"
            title="個人成績"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">個人成績</span>
          </button>
        </div>
      </div>
    </header>
  );
};
