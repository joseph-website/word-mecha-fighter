import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Share2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Flame,
  Clock,
  Target,
  ExternalLink,
  Twitter,
  Facebook
} from 'lucide-react';
import { GameRecord } from '../types';
import { calculateGrade, saveLeaderboardRecord } from '../utils/leaderboard';
import { playVictorySound } from '../utils/audio';

// 依據官方規範之噗浪 (Plurk) 官方識別標誌與標準色 (#FF574D)
const PlurkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.9017 1.9056a10.0652 10.0652 0 00-7.8802 3.707 10.1803 10.1803 0 00-.283.357l.004-.003c.232-.196.473-.345.717-.445l.058-.023c.299-.112.602-.147.9-.088 1.4401.289 2.1901 2.6091 1.6751 5.1832-.515 2.574-2.1 4.4271-3.54 4.139-1.0101-.202-1.6781-1.405-1.8121-2.992v-.005.052c-.003.132-.003.266 0 .4v.073l.002.059c.005.149.013.296.024.443.005.067.012.134.019.2a10.0322 10.0322 0 00.961 3.4431c.06.126.03.276-.078.363l-.277.226a.906.906 0 00-.29.97c0 .006.003.01.006.017a.955.955 0 00.059.142l.05-.039.23-.174a.2612.2612 0 11.316.416l-.245.186-.037.028 1.177 1.4481a.91.91 0 001.275.131l.258-.21a.298.298 0 01.374 0 10.0502 10.0502 0 006.5272 2.181 10.0422 10.0422 0 005.5722-1.855.298.298 0 01.38.025l.163.156a.909.909 0 001.179.059l-.004-.004-.21-.197a.262.262 0 01.358-.382l.225.21 1.26-1.326a.91.91 0 00-.033-1.282l-.263-.25a.297.297 0 01-.054-.36 10.0602 10.0602 0 001.103-6.6712c.301-.278.853-.824 1.0691-1.292.231-.502.29-1.02-.323-.792-.476.177-.842.291-1.286.19-1.417-3.5932-4.8472-6.1932-8.8513-6.4002a9.7102 9.7102 0 00-.473-.014zM2.2645 6.2466a1.228 1.228 0 00-1.082 1.7641 1.23 1.23 0 10.754 2.236c.177-.124.306-.289.395-.47.186.342.46.627.778.823a5.5901 5.5901 0 00.017.6001c.102 1.228.62 2.16 1.401 2.316 1.114.223 2.34-1.21 2.738-3.2.3991-1.99-.181-3.7841-1.295-4.0071-.434-.087-.885.08-1.298.432-.45.383-.854.988-1.14 1.73-.01-.002-.02-.003-.03-.007-.14-.04-.215-.131-.312-.152a1.23 1.23 0 00-.926-2.065zm2.862 1.2441c.054 0 .107.004.16.015.726.143 1.104 1.312.844 2.608-.259 1.2981-1.058 2.2301-1.783 2.0851-.493-.098-.824-.67-.905-1.433.181.07.37.113.56.122.527.024.871-.154 1.14-.513.346-.465.084-1.753-.374-1.92-.356-.13-.567.027-.884.05.16-.298.351-.544.557-.72.219-.185.453-.292.686-.295z" />
  </svg>
);

interface ResultModalProps {
  stats: {
    totalChars: number;
    correctChars: number;
    errorChars: number;
    timeElapsedSeconds: number;
    cpm: number;
    wpm: number;
    accuracy: number;
    maxCombo: number;
    errorRate?: number;
    netCpm?: number;
    missingChars?: number;
    missingRate?: number;
  };
  difficulty: string;
  questionCount: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
  onViewLeaderboard: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  stats,
  difficulty,
  questionCount,
  onPlayAgain,
  onGoHome,
  onViewLeaderboard,
}) => {
  const [playerName, setPlayerName] = useState<string>(() => {
    const stored = localStorage.getItem('chinese_typing_player_name');
    if (stored && (stored.startsWith('鍵客_') || stored === '打字俠客')) {
      return '';
    }
    return stored || '';
  });
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string>('');

  // 錯字率與漏字率計算
  const missingChars = stats.missingChars ?? 0;
  const missingRate =
    stats.missingRate !== undefined
      ? stats.missingRate
      : stats.totalChars > 0
      ? Math.max(0, Math.round((missingChars / stats.totalChars) * 1000) / 10)
      : 0;

  const grade = calculateGrade(stats.cpm, stats.accuracy, missingRate);

  // 錯字率與 Net CPM 計算 (依全局所有題目總字數與打錯字數)
  const errorRate =
    stats.errorRate !== undefined
      ? stats.errorRate
      : stats.totalChars > 0
      ? Math.max(0, Math.round(((stats.totalChars - stats.correctChars) / stats.totalChars) * 1000) / 10)
      : 0;

  const netCpm = stats.netCpm !== undefined ? stats.netCpm : stats.cpm;

  // 觸發慶祝紙花與勝利音效
  useEffect(() => {
    playVictorySound();
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#f97316'],
      });
    } catch {
      // ignore
    }
  }, []);

  const difficultyLabel =
    difficulty === 'easy'
      ? '初級短語'
      : difficulty === 'medium'
      ? '中級名句'
      : difficulty === 'hard'
      ? '高級古文'
      : '綜合混合';

  // 儲存至排行榜
  const handleSaveToLeaderboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const record: GameRecord = {
      id: `record-${Date.now()}`,
      playerName: playerName.trim(),
      date: new Date().toISOString().split('T')[0],
      questionCount,
      difficulty,
      cpm: stats.cpm,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      totalChars: stats.totalChars,
      correctChars: stats.correctChars,
      errorChars: stats.errorChars,
      timeElapsedSeconds: Math.round(stats.timeElapsedSeconds * 10) / 10,
      grade,
      maxCombo: stats.maxCombo,
      errorRate,
      netCpm,
      missingChars,
      missingRate,
    };

    saveLeaderboardRecord(record);
    setIsSaved(true);
    setShareFeedback('成績已成功存入個人成績紀錄！');
  };

  // 格式化分享文案
  const shareText = `🚀 我在「打字機動戰士」成功擊破了 ${questionCount} 艘空中飄浮【${difficultyLabel}】！
⚡ 擊破速度：${stats.cpm} 字/分 (Net CPM)
🎯 命中準確率：${stats.accuracy}% (錯字率：${errorRate}% / 漏字率：${missingRate}%)
💥 擊破字數：${stats.correctChars} / ${stats.totalChars} 字${missingChars > 0 ? ` (漏打 ${missingChars} 字)` : ' (零漏字)'}
⏱️ 防禦耗時：${stats.timeElapsedSeconds.toFixed(1)} 秒
🔥 最高連擊：${stats.maxCombo} Combo
🎖️ 戰鬥評級：【${grade} 級】！
來空中挑戰打字擊破吧 👉 ${typeof window !== 'undefined' ? window.location.href : ''}`;

  // 複製文字至剪貼簿
  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setShareFeedback('成績卡文案已複製到剪貼簿！');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setShareFeedback('複製失敗，請手動複製');
    }
  };

  // 社群平台快速分享連結
  const shareToPlurk = () => {
    const url = `https://www.plurk.com/?qualifier=shares&status=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      window.location.href
    )}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      id="result-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="result-modal-content"
        className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto animate-scale-up"
      >
        {/* Header with Grade Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 font-black text-4xl shadow-xl shadow-amber-500/25 ring-4 ring-amber-500/20">
            {grade}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-100">
            空域目標全數擊破！
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            成功防禦並擊破 {questionCount} 題【{difficultyLabel}】空中飄浮詞句
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-stone-400 block mb-1">淨打字速度</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{stats.cpm}</span>
            <span className="text-[10px] text-stone-500 block">Net CPM</span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-stone-400 block mb-1">命中準確率</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{stats.accuracy}%</span>
            <span className="text-[10px] text-rose-400/90 block font-mono">錯字率 {errorRate}%</span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-stone-400 block mb-1">漏字率</span>
            <span className={`text-xl sm:text-2xl font-bold font-mono ${missingChars === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {missingRate}%
            </span>
            <span className="text-[10px] text-stone-400 block font-mono">
              {missingChars > 0 ? `漏打 ${missingChars} 字` : '零漏字 ⭐'}
            </span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-stone-400 block mb-1">擊破字數</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-sky-400">{stats.correctChars}<span className="text-xs text-stone-500">/{stats.totalChars}</span></span>
            <span className="text-[10px] text-stone-500 block">正確/總字數</span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-stone-400 block mb-1">總耗時</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-stone-200">
              {stats.timeElapsedSeconds.toFixed(1)}
            </span>
            <span className="text-[10px] text-stone-500 block">秒</span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
            <span className="text-[11px] text-stone-400 block mb-1">最高連擊</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-orange-400">{stats.maxCombo}</span>
            <span className="text-[10px] text-stone-500 block">Combo</span>
          </div>
        </div>

        {/* Save to Leaderboard Section */}
        <div className="bg-stone-950/60 border border-stone-800/90 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              登記至個人成績紀錄
            </span>
            {isSaved && <span className="text-emerald-400 text-xs font-medium">已成功儲存！</span>}
          </div>

          {!isSaved ? (
            <form onSubmit={handleSaveToLeaderboard} className="flex gap-2">
              <input
                id="input-player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="輸入你的大名或暱稱..."
                maxLength={12}
                className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
              <button
                id="btn-save-record"
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all"
              >
                保存紀錄
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between text-xs text-stone-400 bg-stone-900/60 px-3 py-2 rounded-xl">
              <span>玩家：{playerName}</span>
              <button
                id="btn-view-leaderboard-from-result"
                onClick={onViewLeaderboard}
                className="text-amber-400 hover:underline flex items-center gap-1"
              >
                前往查看個人成績 &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Social Sharing Mechanism Section */}
        <div className="bg-stone-950/60 border border-stone-800/90 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-300 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-amber-400" />
              社群分享成績卡
            </span>
            {shareFeedback && <span className="text-amber-400 text-xs">{shareFeedback}</span>}
          </div>

          {/* Formatted Share Preview Snippet */}
          <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 text-xs text-stone-300 font-mono whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto">
            {shareText}
          </div>

          {/* Share Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              id="btn-copy-share-text"
              onClick={handleCopyShare}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '已複製' : '複製'}</span>
            </button>

            <button
              id="btn-share-plurk"
              onClick={shareToPlurk}
              className="px-3 py-2 rounded-xl bg-[#FF574D]/15 border border-[#FF574D]/30 hover:bg-[#FF574D]/25 text-[#FF574D] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <PlurkIcon className="w-4 h-4" />
              <span>Plurk</span>
            </button>

            <button
              id="btn-share-facebook"
              onClick={shareToFacebook}
              className="px-3 py-2 rounded-xl bg-[#1877F2]/15 border border-[#1877F2]/30 hover:bg-[#1877F2]/25 text-[#1877F2] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Facebook className="w-4 h-4" />
              <span>Facebook</span>
            </button>

            <button
              id="btn-share-twitter"
              onClick={shareToTwitter}
              className="px-3 py-2 rounded-xl bg-[#1DA1F2]/15 border border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/25 text-[#1DA1F2] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Twitter className="w-4 h-4" />
              <span>X（推特）</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-2 gap-3">
          <button
            id="btn-return-home"
            onClick={onGoHome}
            className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium transition-colors"
          >
            返回主選單
          </button>

          <button
            id="btn-play-again"
            onClick={onPlayAgain}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>再挑戰一局</span>
          </button>
        </div>
      </div>
    </div>
  );
};
