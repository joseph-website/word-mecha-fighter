import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
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
  Facebook,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { GameRecord, RoundReviewItem } from '../types';
import { calculateGrade, saveLeaderboardRecord, getLeaderboardRecords } from '../utils/leaderboard';
import { playVictorySound } from '../utils/audio';

const RoundReviewModal = React.lazy(() =>
  import('./arena/RoundReviewModal').then((m) => ({ default: m.RoundReviewModal }))
);

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
    destroyedCount?: number;
    perfectCount?: number;
    goodCount?: number;
    skippedCount?: number;
    totalQuestionsCount?: number;
    roundReviews?: RoundReviewItem[];
  };
  difficulty: string;
  questionCount: number;
  destroyedCount?: number;
  totalQuestionsCount?: number;
  selectedCategories?: string[];
  onPlayAgain: () => void;
  onGoHome: () => void;
  onViewLeaderboard: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  stats,
  difficulty,
  questionCount,
  destroyedCount,
  totalQuestionsCount,
  selectedCategories,
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
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

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

  // 檢查是否突破個人歷史最佳紀錄 (New PB)
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [previousBestCpm, setPreviousBestCpm] = useState<number | null>(null);

  useEffect(() => {
    try {
      const records = getLeaderboardRecords();
      if (records && records.length > 0) {
        const best = Math.max(...records.map((r) => r.netCpm || r.cpm));
        setPreviousBestCpm(best);
        if (netCpm > best) {
          setIsNewRecord(true);
          // 突破紀錄發射專屬金色慶祝紙花
          setTimeout(() => {
            try {
              confetti({
                particleCount: 85,
                spread: 90,
                origin: { y: 0.4 },
                colors: ['#fbbf24', '#f59e0b', '#d97706', '#ffffff'],
              });
            } catch {
              // ignore
            }
          }, 350);
        }
      }
    } catch (e) {
      console.error('Error checking personal best:', e);
    }
  }, [netCpm]);

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
      roundReviews: stats.roundReviews,
    };

    saveLeaderboardRecord(record);
    setIsSaved(true);
    setShareFeedback('成績已成功存入個人成績紀錄！');
  };

  const actualDestroyedCount =
    destroyedCount !== undefined
      ? destroyedCount
      : stats.destroyedCount !== undefined
      ? stats.destroyedCount
      : questionCount;

  const totalQuestions =
    totalQuestionsCount !== undefined
      ? totalQuestionsCount
      : stats.totalQuestionsCount !== undefined
      ? stats.totalQuestionsCount
      : questionCount;

  // 格式化分享文案
  const shareText = `🚀 我在「打字機動戰士」成功擊破了 ${actualDestroyedCount} 艘空中飄浮【${difficultyLabel}】！
⚡ 擊破速度：${stats.cpm} 字/分 (Net CPM)
🎯 命中準確率：${stats.accuracy}% (錯字率：${errorRate}% / 漏字率：${missingRate}%)
💥 擊破字數：${stats.correctChars} / ${stats.totalChars} 字${missingChars > 0 ? ` (漏打 ${missingChars} 字)` : ' (零漏字)'}
⏱️ 防禦耗時：${stats.timeElapsedSeconds.toFixed(1)} 秒
🔥 最高連擊：${stats.maxCombo} Combo
🎖️ 戰鬥評級：【${grade} 級】！
${isNewRecord ? '🏆 突破個人最佳成績！\n' : ''}來空中挑戰打字擊破吧 👉 ${typeof window !== 'undefined' ? window.location.href : ''}`;

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
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex justify-center items-start sm:items-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="result-modal-content"
        className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto animate-scale-up"
      >
        {/* Header with Grade Badge */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 font-black text-3xl shadow-lg shadow-amber-500/20 ring-4 ring-amber-500/20">
            {grade}
          </div>

          {/* 突破個人紀錄提示文字與慶祝動畫 */}
          {isNewRecord && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: -6 }}
              animate={{ scale: [0.5, 1.08, 1], opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
              className="relative overflow-hidden mx-auto max-w-sm bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/90 rounded-xl p-2 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs sm:text-sm tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-spin-slow shrink-0" />
                  <span>🏆 突破個人最佳紀錄 NEW RECORD 🏆</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-spin-slow shrink-0" />
                </div>
                {previousBestCpm !== null && (
                  <span className="text-[10px] text-amber-200/90 font-mono bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/50">
                    原最佳 {previousBestCpm} ➔ <strong>新紀錄 {netCpm} CPM</strong>
                  </span>
                )}
              </div>
            </motion.div>
          )}

          <h2 className="text-lg sm:text-xl font-bold text-stone-100">
            {totalQuestions > 0 && actualDestroyedCount >= totalQuestions
              ? '空域目標全數擊破！'
              : actualDestroyedCount > 0
              ? '空域防衛作戰完成！'
              : '空域防衛作戰結束！'}
          </h2>
          <p className="text-xs text-stone-400">
            成功防禦並擊破 {actualDestroyedCount} 題【{difficultyLabel}】
            {selectedCategories && selectedCategories.length > 0 && (
              <span className="text-amber-400 block sm:inline sm:ml-1.5">
                · {selectedCategories.join('、')}
              </span>
            )}
          </p>
        </div>

        {/* Stats Grid - 精簡 3 欄 2 排 HUD 儀表 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-stone-950/80 border border-stone-800/90 rounded-xl p-2 sm:p-2.5">
            <span className="text-[11px] text-stone-400 block">打字速度</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-amber-400">{stats.cpm}</span>
            <span className="text-[9px] text-stone-500 block">Net CPM</span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/90 rounded-xl p-2 sm:p-2.5">
            <span className="text-[11px] text-stone-400 block">命中準率</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400">{stats.accuracy}%</span>
            <span className="text-[9px] text-rose-400/90 block font-mono">錯字 {errorRate}%</span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/90 rounded-xl p-2 sm:p-2.5">
            <span className="text-[11px] text-stone-400 block">漏字率</span>
            <span className={`text-lg sm:text-xl font-bold font-mono ${missingChars === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {missingRate}%
            </span>
            <span className="text-[9px] text-stone-400 block font-mono">
              {missingChars > 0 ? `漏 ${missingChars} 字` : '零漏字 ⭐'}
            </span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/90 rounded-xl p-2 sm:p-2.5">
            <span className="text-[11px] text-stone-400 block">擊破字數</span>
            <span className="text-base sm:text-lg font-bold font-mono text-sky-400">
              {stats.correctChars}<span className="text-xs text-stone-500">/{stats.totalChars}</span>
            </span>
            <span className="text-[9px] text-stone-500 block">字數</span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/90 rounded-xl p-2 sm:p-2.5">
            <span className="text-[11px] text-stone-400 block">總耗時</span>
            <span className="text-base sm:text-lg font-bold font-mono text-stone-200">
              {stats.timeElapsedSeconds.toFixed(1)}s
            </span>
            <span className="text-[9px] text-stone-500 block">秒</span>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/90 rounded-xl p-2 sm:p-2.5">
            <span className="text-[11px] text-stone-400 block">最高連擊</span>
            <span className="text-base sm:text-lg font-bold font-mono text-orange-400">{stats.maxCombo}</span>
            <span className="text-[9px] text-stone-500 block">Combo</span>
          </div>
        </div>

        {/* 戰績回顧功能按鈕 (點擊彈出專屬獨立視窗) */}
        {stats.roundReviews && stats.roundReviews.length > 0 && (() => {
          const reviews = stats.roundReviews;
          const perfectCount = reviews.filter((r) => r.status === 'perfect').length;
          const passedCount = reviews.filter((r) => r.status === 'passed').length;
          const skippedCount = reviews.filter((r) => r.status === 'skipped').length;

          return (
            <>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-stone-950/80 hover:bg-stone-900 border border-stone-800 hover:border-amber-500/50 transition-all group cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                    <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-sm font-bold text-stone-200 group-hover:text-amber-300 transition-colors">
                        戰績回顧
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
                        共 {reviews.length} 題
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-stone-400 mt-0.5 font-mono">
                      {perfectCount > 0 && (
                        <span className="text-emerald-400 font-semibold">Perfect {perfectCount}</span>
                      )}
                      {passedCount > 0 && (
                        <span className="text-amber-400 font-semibold">Good {passedCount}</span>
                      )}
                      {skippedCount > 0 && (
                        <span className="text-rose-400 font-semibold">Pass {skippedCount}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-stone-400 group-hover:text-amber-400 transition-colors shrink-0">
                  <span className="text-[11px] hidden xs:inline">點擊查看詳情</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {isReviewModalOpen && (
                <React.Suspense fallback={null}>
                  <RoundReviewModal
                    roundReviews={reviews}
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                  />
                </React.Suspense>
              )}
            </>
          );
        })()}

        {/* Save to Leaderboard Section - 精簡單行佈局 */}
        <div className="bg-stone-950/60 border border-stone-800/90 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-300 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
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
                placeholder="輸入大名或暱稱..."
                maxLength={12}
                className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
              <button
                id="btn-save-record"
                type="submit"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs shadow-md transition-all cursor-pointer"
              >
                保存紀錄
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between text-xs text-stone-400 bg-stone-900/60 px-3 py-1.5 rounded-lg">
              <span>玩家：{playerName}</span>
              <button
                id="btn-view-leaderboard-from-result"
                onClick={onViewLeaderboard}
                className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                前往查看個人成績 &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Social Sharing Section - 精簡社群分享列 */}
        <div className="bg-stone-950/60 border border-stone-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-stone-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              分享成績卡
            </span>
            {shareFeedback && <span className="text-amber-400 text-xs font-mono">{shareFeedback}</span>}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              id="btn-copy-share-text"
              onClick={handleCopyShare}
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-300" />}
              <span>{copied ? '已複製' : '複製'}</span>
            </button>

            <button
              id="btn-share-plurk"
              onClick={shareToPlurk}
              className="px-2.5 py-1.5 rounded-lg bg-[#FF574D]/15 border border-[#FF574D]/30 hover:bg-[#FF574D]/25 text-[#FF574D] text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <PlurkIcon className="w-3.5 h-3.5" />
              <span>Plurk</span>
            </button>

            <button
              id="btn-share-facebook"
              onClick={shareToFacebook}
              className="px-2.5 py-1.5 rounded-lg bg-[#1877F2]/15 border border-[#1877F2]/30 hover:bg-[#1877F2]/25 text-[#1877F2] text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>FB</span>
            </button>

            <button
              id="btn-share-twitter"
              onClick={shareToTwitter}
              className="px-2.5 py-1.5 rounded-lg bg-[#1DA1F2]/15 border border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/25 text-[#1DA1F2] text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Twitter className="w-3.5 h-3.5" />
              <span>X (推特)</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-1 gap-2.5">
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
