import React from 'react';
import { Volume2, VolumeX, Trophy, BookOpen, HelpCircle } from 'lucide-react';
import { toggleSound } from '../utils/audio';

interface HeaderProps {
  soundOn: boolean;
  setSoundOn: (val: boolean) => void;
  onOpenLeaderboard: () => void;
  onOpenQuestionBank: () => void;
  onOpenInstructions: () => void;
  onGoHome: () => void;
  isPlaying: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  soundOn,
  setSoundOn,
  onOpenLeaderboard,
  onOpenQuestionBank,
  onOpenInstructions,
  onGoHome,
  isPlaying,
}) => {
  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
  };

  return (
    <header
      id="app-header"
      className="w-full border-b border-stone-800 bg-stone-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors"
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-13 sm:h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <button
          id="btn-brand-home"
          onClick={onGoHome}
          className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none cursor-pointer"
          title="回首頁"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <span className="font-black text-base sm:text-xl leading-none select-none">字</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-lg text-stone-100 group-hover:text-amber-400 transition-colors">
                打字機動戰士
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                SHOOTER
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-sans hidden sm:block">
              妙語如珠 · 例不虛發
            </p>
          </div>
        </button>

        {/* Global Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Instructions Button */}
          <button
            id="btn-open-instructions"
            onClick={onOpenInstructions}
            className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            title="遊戲說明與操作指南"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">說明</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={handleSoundToggle}
            className={`p-2 rounded-lg border transition-colors ${
              soundOn
                ? 'bg-stone-900 border-stone-800 text-amber-400 hover:bg-stone-800'
                : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
            title={soundOn ? '音效已開啟 (點擊靜音)' : '音效已關閉 (點擊開啟)'}
            aria-label="音效切換"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Question Bank Manager */}
          <button
            id="btn-open-question-bank"
            onClick={onOpenQuestionBank}
            className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/30 transition-all flex items-center gap-1.5"
            title="編輯題庫"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">編輯題庫</span>
          </button>

          {/* Personal Records Button */}
          <button
            id="btn-open-leaderboard"
            onClick={onOpenLeaderboard}
            className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 shadow-sm"
            title="個人成績"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">個人成績</span>
          </button>
        </div>
      </div>
    </header>
  );
};
