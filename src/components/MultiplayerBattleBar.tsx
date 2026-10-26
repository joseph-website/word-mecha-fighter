import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Flag, Crown, Zap } from 'lucide-react';
import { PlayerState } from '../types';

interface MultiplayerBattleBarProps {
  players: PlayerState[];
  myPlayerId: string;
  totalQuestions: number;
  battleEvents: { id: string; text: string; type: 'clear' | 'combo' | 'finish' }[];
}

// 預設其他對手的標記顏色（明亮且彼此易區分）
const OPPONENT_COLORS = [
  { bg: 'bg-cyan-500', border: 'border-cyan-300', text: 'text-cyan-400', shadow: 'shadow-cyan-500/50' },
  { bg: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-emerald-400', shadow: 'shadow-emerald-500/50' },
  { bg: 'bg-purple-500', border: 'border-purple-300', text: 'text-purple-400', shadow: 'shadow-purple-500/50' },
  { bg: 'bg-rose-500', border: 'border-rose-300', text: 'text-rose-400', shadow: 'shadow-rose-500/50' },
  { bg: 'bg-blue-500', border: 'border-blue-300', text: 'text-blue-400', shadow: 'shadow-blue-500/50' },
];

export const MultiplayerBattleBar: React.FC<MultiplayerBattleBarProps> = ({
  players,
  myPlayerId,
  totalQuestions,
  battleEvents,
}) => {
  // 按照完成題目進度與 CPM 排序計算名次
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isFinished && !b.isFinished) return -1;
    if (!a.isFinished && b.isFinished) return 1;
    if (a.isFinished && b.isFinished) {
      return (a.finishTime || 9999) - (b.finishTime || 9999);
    }
    if (b.overallPercent !== a.overallPercent) {
      return b.overallPercent - a.overallPercent;
    }
    return b.cpm - a.cpm;
  });

  const totalPlayers = players.length;
  const myRankIndex = sortedPlayers.findIndex((p) => p.id === myPlayerId);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : 1;
  const isMyRankFirst = myRank === 1;
  const myPlayer = players.find((p) => p.id === myPlayerId);

  // 取得最新一則快訊
  const latestEvent = battleEvents.length > 0 ? battleEvents[battleEvents.length - 1] : null;

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto px-1 sm:px-2 py-0.5 shrink-0">
      {/* 簡易單線對戰進度條 (Compact Battle Track, ~38px 高度，大幅減輕扁平螢幕視覺壓迫) */}
      <div className="bg-stone-900/90 border border-stone-800/90 rounded-xl px-2.5 sm:px-3.5 py-1.5 shadow-md backdrop-blur-md flex items-center gap-2 sm:gap-3">
        {/* 左側：即時名次徽章 (Crown for 1st) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            id="multiplayer-my-live-rank"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono font-bold text-xs shadow-sm transition-all ${
              isMyRankFirst
                ? 'bg-amber-500/20 border-amber-400/80 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.25)]'
                : 'bg-stone-800 border-stone-700 text-stone-200'
            }`}
            title={`目前名次：第 ${myRank} 名 / 共 ${totalPlayers} 人`}
          >
            {isMyRankFirst ? (
              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_#f59e0b] animate-bounce shrink-0" />
            ) : (
              <Trophy className="w-3 h-3 text-stone-400 shrink-0" />
            )}
            <span className="tracking-tight">{myRank}/{totalPlayers}</span>
          </div>

          {/* 我的即時進度小標籤 */}
          {myPlayer && (
            <span className="hidden md:inline font-mono text-[11px] text-amber-400 font-semibold shrink-0">
              {Math.round(myPlayer.overallPercent)}%
            </span>
          )}
        </div>

        {/* 中央：全體玩家共享的簡易單軌賽道 (Racing Track) */}
        <div className="relative flex-1 h-6 flex items-center min-w-0">
          {/* 跑道底槽 */}
          <div className="relative w-full h-2 bg-stone-950 rounded-full border border-stone-800 overflow-visible shadow-inner">
            {/* 我的專屬背景漸層進度底色 */}
            {myPlayer && (
              <div
                className="h-full bg-gradient-to-r from-amber-600/40 via-amber-500/50 to-amber-400/60 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, myPlayer.overallPercent))}%` }}
              />
            )}

            {/* 終點線旗幟 🏁 */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 flex items-center justify-center pointer-events-none z-10"
              title="終點 (全破)"
            >
              <Flag className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/30 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
            </div>

            {/* 各玩家位置標記 Pin */}
            {sortedPlayers.map((p, idx) => {
              const isMe = p.id === myPlayerId;
              const percent = Math.min(100, Math.max(0, p.overallPercent));
              // 對手顏色配置
              const oppColor = OPPONENT_COLORS[idx % OPPONENT_COLORS.length];

              return (
                <div
                  key={p.id}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300 ease-out z-20 group"
                  style={{ left: `${percent}%` }}
                >
                  {isMe ? (
                    /* 我自己的專屬標記：亮黃金色發光徽章 */
                    <div className="relative flex flex-col items-center cursor-pointer">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 border-2 border-stone-900 shadow-[0_0_10px_rgba(251,191,36,0.9)] flex items-center justify-center ring-2 ring-amber-400/80 animate-pulse">
                        <span className="text-[8px] font-black text-stone-950 font-mono leading-none">我</span>
                      </div>
                      {/* Hover Tooltip */}
                      <div className="absolute -top-7 whitespace-nowrap bg-stone-900/95 border border-amber-500/80 text-amber-300 text-[10px] px-1.5 py-0.5 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity font-mono z-30">
                        我 (第 {myRank} 名) · {p.cpm} CPM
                      </div>
                    </div>
                  ) : (
                    /* 其他對手的簡易微型標記點 (Mini Pin with Initial) */
                    <div className="relative flex flex-col items-center cursor-pointer">
                      <div
                        className={`w-3 h-3 rounded-full ${oppColor.bg} border border-stone-900 shadow-sm ${oppColor.shadow} flex items-center justify-center transition-transform hover:scale-125`}
                      >
                        <span className="text-[7px] font-bold text-stone-950 uppercase leading-none">
                          {p.name.charAt(0) || 'P'}
                        </span>
                      </div>
                      {/* Hover Tooltip */}
                      <div className="absolute -top-7 whitespace-nowrap bg-stone-900/95 border border-stone-750 text-stone-200 text-[10px] px-1.5 py-0.5 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity font-mono z-30">
                        {p.name} · {Math.round(p.overallPercent)}% ({p.cpm} CPM)
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 右側：精簡戰況快訊 (或領先者提示) */}
        <div className="shrink-0 flex items-center justify-end min-w-[70px] sm:min-w-[130px] max-w-[200px] overflow-hidden">
          <AnimatePresence mode="wait">
            {latestEvent ? (
              <motion.div
                key={latestEvent.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-[10px] sm:text-[11px] text-amber-300 font-medium truncate flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/30"
                title={latestEvent.text}
              >
                <Zap className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span className="truncate">{latestEvent.text}</span>
              </motion.div>
            ) : (
              <span className="text-[10px] text-stone-500 font-mono hidden sm:inline truncate">
                目標: {totalQuestions} 題奪冠
              </span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
