import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, CheckCircle, AlertTriangle, SkipForward } from 'lucide-react';
import { RoundReviewItem } from '../../types';

interface RoundReviewModalProps {
  roundReviews: RoundReviewItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const RoundReviewModal: React.FC<RoundReviewModalProps> = ({
  roundReviews,
  isOpen,
  onClose,
}) => {
  const [reviewFilter, setReviewFilter] = useState<'all' | 'perfect' | 'passed' | 'skipped'>('all');

  // 支援 ESC 鍵關閉彈窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!roundReviews || roundReviews.length === 0) {
    return null;
  }

  const perfectCount = roundReviews.filter((r) => r.status === 'perfect').length;
  const passedCount = roundReviews.filter((r) => r.status === 'passed').length;
  const skippedCount = roundReviews.filter((r) => r.status === 'skipped').length;

  const filteredReviews = roundReviews.filter((r) => {
    if (reviewFilter === 'all') return true;
    return r.status === reviewFilter;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10"
          >
            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-stone-800/90 flex items-center justify-between bg-stone-950/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-stone-100 tracking-wide">
                      戰績回顧
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
                      共 {roundReviews.length} 題
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                    檢視本局所有出題之正確讀音、打字命中對比與典故註解
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
                title="關閉 (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs Bar */}
            <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-b border-stone-800/60 bg-stone-950/30 flex items-center gap-1.5 flex-wrap shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
                  reviewFilter === 'all'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <span>全部</span>
                <span className="text-[11px] opacity-80 font-mono">({roundReviews.length})</span>
              </button>

              {perfectCount > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter('perfect')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                    reviewFilter === 'perfect'
                      ? 'bg-emerald-500 text-stone-950 font-bold shadow'
                      : 'bg-emerald-950/40 text-emerald-300 hover:text-emerald-200 border border-emerald-800/50'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Perfect</span>
                  <span className="text-[11px] opacity-80 font-mono">({perfectCount})</span>
                </button>
              )}

              {passedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter('passed')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                    reviewFilter === 'passed'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow'
                      : 'bg-amber-950/40 text-amber-300 hover:text-amber-200 border border-amber-800/50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Good</span>
                  <span className="text-[11px] opacity-80 font-mono">({passedCount})</span>
                </button>
              )}

              {skippedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter('skipped')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                    reviewFilter === 'skipped'
                      ? 'bg-rose-500 text-white font-bold shadow'
                      : 'bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-800/50'
                  }`}
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Pass</span>
                  <span className="text-[11px] opacity-80 font-mono">({skippedCount})</span>
                </button>
              )}
            </div>

            {/* Questions List (舒適大方滾動區域) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-0 overscroll-contain">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-12 text-stone-500 text-sm">
                  沒有符合當前篩選條件的題目
                </div>
              ) : (
                filteredReviews.map((item, idx) => {
                  const isSkipped = item.status === 'skipped';
                  const isPerfect = item.status === 'perfect';

                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm space-y-2 transition-all ${
                        isSkipped
                          ? 'bg-rose-950/20 border-rose-800/50'
                          : isPerfect
                          ? 'bg-emerald-950/20 border-emerald-800/50'
                          : 'bg-amber-950/20 border-amber-800/50'
                      }`}
                    >
                      {/* 頂部序號與狀態徽章 */}
                      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-400 bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800 text-[11px]">
                            #{item.questionIndex}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                              isSkipped
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isPerfect
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {isSkipped
                              ? 'Pass'
                              : isPerfect
                              ? 'Perfect'
                              : `Good ${item.damagePercent || 0}%`}
                          </span>
                          <span className="text-[11px] text-stone-400 bg-stone-900/90 px-2 py-0.5 rounded-md border border-stone-800">
                            {item.category}
                          </span>
                        </div>

                        {item.bopomofo && (
                          <span className="text-xs text-amber-400/90 font-mono tracking-wide bg-stone-950/80 px-2.5 py-0.5 rounded-md border border-stone-800">
                            {item.bopomofo}
                          </span>
                        )}
                      </div>

                      {/* 題目目標句子 */}
                      <div className="font-bold text-stone-100 text-sm sm:text-base leading-relaxed tracking-wide pt-0.5">
                        {item.questionText}
                      </div>

                      {/* 玩家輸入對照與註解 */}
                      <div className="flex items-center justify-between gap-3 text-xs pt-1 border-t border-stone-800/60 font-mono flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-500 font-sans">玩家輸入:</span>
                          {isSkipped ? (
                            <span className="text-rose-400 italic">
                              {item.userTyped ? `"${item.userTyped}" (已跳過)` : '(直接跳過)'}
                            </span>
                          ) : (
                            <span className={isPerfect ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'}>
                              {item.userTyped || '(無輸入)'}
                            </span>
                          )}
                        </div>

                        {item.meaning && (
                          <div className="text-stone-400 text-xs font-sans ml-auto truncate max-w-[280px] sm:max-w-md">
                            {item.meaning}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-stone-800/90 bg-stone-950/80 flex items-center justify-between shrink-0">
              <div className="text-xs text-stone-400 hidden xs:flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Perfect {perfectCount}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Good {passedCount}</span>
                </span>
                {skippedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Pass {skippedCount}</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full xs:w-auto px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ml-auto"
              >
                關閉回顧
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
