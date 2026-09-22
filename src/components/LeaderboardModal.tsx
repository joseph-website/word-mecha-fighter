import React, { useState, useEffect } from 'react';
import { Trophy, Medal, X, Trash2, Filter, Flame } from 'lucide-react';
import { GameRecord } from '../types';
import { getLeaderboardRecords, clearLeaderboardRecords } from '../utils/leaderboard';

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCount, setSelectedCount] = useState<number | 'all'>('all');

  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  useEffect(() => {
    setRecords(getLeaderboardRecords());
  }, []);

  const handleClear = () => {
    if (confirmClear) {
      clearLeaderboardRecords();
      setRecords([]);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
    }
  };

  // 篩選紀錄
  const filteredRecords = records.filter((r) => {
    const diffMatch = selectedDifficulty === 'all' || r.difficulty === selectedDifficulty;
    const countMatch = selectedCount === 'all' || r.questionCount === selectedCount;
    return diffMatch && countMatch;
  });

  return (
    <div
      id="leaderboard-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="leaderboard-modal-content"
        className="w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-100 flex items-center gap-2">
                <span>個人成績紀錄</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-amber-400 font-mono font-normal">
                  共 {records.length} 筆
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                記錄本機每次挑戰的打字速度 (CPM)、準確率與個人最佳成就
              </p>
            </div>
          </div>

          <button
            id="btn-close-leaderboard"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Difficulty Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">難度：</span>
              <select
                id="select-filter-difficulty"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">全部難度</option>
                <option value="easy">初級短語</option>
                <option value="medium">中級名句</option>
                <option value="hard">高級古文</option>
              </select>
            </div>

            {/* Question Count Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">題數：</span>
              <select
                id="select-filter-count"
                value={selectedCount}
                onChange={(e) =>
                  setSelectedCount(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">全部題數</option>
                <option value="5">5 題</option>
                <option value="10">10 題</option>
                <option value="20">20 題</option>
              </select>
            </div>
          </div>

          {records.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                id="btn-clear-leaderboard"
                onClick={handleClear}
                className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                  confirmClear
                    ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                    : 'bg-rose-950/40 border-rose-800/40 hover:bg-rose-900/40 text-rose-300'
                }`}
                title="清空個人所有成績紀錄"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmClear ? '再點一次確定清空' : '清空全部紀錄'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Records Table / List */}
        <div className="flex-1 overflow-y-auto min-h-[260px] pr-1 space-y-2">
          {records.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-stone-500 text-sm gap-3">
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 text-amber-500/50">
                <Trophy className="w-8 h-8 opacity-60" />
              </div>
              <div>
                <p className="font-semibold text-stone-200 text-base">目前尚無個人成績紀錄</p>
                <p className="text-xs text-stone-400 mt-1 max-w-sm">
                  完成任何打字挑戰並登記成績後，您的打字速度 (CPM)、準確率與評級將會保存在此處。
                </p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-stone-500 text-sm gap-2">
              <Filter className="w-8 h-8 opacity-40" />
              <p>沒有符合當前難度或題數篩選的個人成績紀錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950/80 text-stone-400 font-semibold border-b border-stone-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">名次</th>
                    <th className="py-2.5 px-3">玩家</th>
                    <th className="py-2.5 px-3 text-right">速度 (CPM)</th>
                    <th className="py-2.5 px-3 text-right">準確率</th>
                    <th className="py-2.5 px-3 text-right">耗時</th>
                    <th className="py-2.5 px-3 text-center">評級</th>
                    <th className="py-2.5 px-3">關卡設定</th>
                    <th className="py-2.5 px-3 text-right">日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredRecords.map((r, idx) => {
                    const isGold = idx === 0;
                    const isSilver = idx === 1;
                    const isBronze = idx === 2;

                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-stone-800/40 transition-colors ${
                          isGold
                            ? 'bg-amber-500/10'
                            : isSilver
                            ? 'bg-stone-400/5'
                            : isBronze
                            ? 'bg-orange-500/5'
                            : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3 px-3 font-mono font-bold">
                          {isGold ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-black text-sm">
                              🥇 1
                            </span>
                          ) : isSilver ? (
                            <span className="inline-flex items-center gap-1 text-stone-300 font-black text-sm">
                              🥈 2
                            </span>
                          ) : isBronze ? (
                            <span className="inline-flex items-center gap-1 text-orange-400 font-black text-sm">
                              🥉 3
                            </span>
                          ) : (
                            <span className="text-stone-400">{idx + 1}</span>
                          )}
                        </td>

                        {/* Player Name */}
                        <td className="py-3 px-3 font-medium text-stone-100">
                          {r.playerName}
                        </td>

                        {/* CPM */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                          {r.cpm} <span className="text-[10px] text-stone-500 font-normal">字/分</span>
                        </td>

                        {/* Accuracy */}
                        <td className="py-3 px-3 text-right font-mono">
                          <span
                            className={
                              r.accuracy >= 95
                                ? 'text-emerald-400 font-semibold'
                                : r.accuracy >= 85
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }
                          >
                            {r.accuracy}%
                          </span>
                        </td>

                        {/* Time */}
                        <td className="py-3 px-3 text-right font-mono text-stone-400">
                          {r.timeElapsedSeconds}s
                        </td>

                        {/* Grade */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[11px] ${
                              r.grade === 'S+' || r.grade === 'S'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : r.grade === 'A'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {r.grade}
                          </span>
                        </td>

                        {/* Difficulty & Count */}
                        <td className="py-3 px-3 text-stone-400">
                          <span className="px-1.5 py-0.5 rounded bg-stone-800 text-[10px]">
                            {r.questionCount}題 · {r.difficulty === 'easy' ? '初級' : r.difficulty === 'medium' ? '中級' : '高級'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-right font-mono text-stone-500 text-[11px]">
                          {r.date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-stone-800">
          <button
            id="btn-close-leaderboard-footer"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
