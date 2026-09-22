import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Flame, Zap, CheckCircle2, Flag } from 'lucide-react';
import { PlayerState } from '../types';

interface MultiplayerBattleBarProps {
  players: PlayerState[];
  myPlayerId: string;
  totalQuestions: number;
  battleEvents: { id: string; text: string; type: 'clear' | 'combo' | 'finish' }[];
}

export const MultiplayerBattleBar: React.FC<MultiplayerBattleBarProps> = ({
  players,
  myPlayerId,
  totalQuestions,
  battleEvents,
}) => {
  // 按照完成題目進度與 CPM 排序
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

  return (
    <div className="w-full max-w-5xl mx-auto mb-4 px-2">
      {/* 連線對戰即時賽況板 */}
      <div className="bg-stone-900/90 border border-stone-800/90 rounded-xl p-3 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between mb-2 text-xs font-semibold text-stone-400">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            多人對決即時名次榜 ({players.length} 人競速)
          </span>
          <span className="text-[11px] text-stone-500 font-mono">
            目標: 先擊破全數 {totalQuestions} 題者奪冠
          </span>
        </div>

        {/* 玩家進度條列表 (2-6 人) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {sortedPlayers.map((player, rankIndex) => {
            const isMe = player.id === myPlayerId;
            const rank = rankIndex + 1;
            const rankMedal =
              rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            return (
              <div
                key={player.id}
                className={`p-2 rounded-lg border text-xs transition-all relative overflow-hidden ${
                  isMe
                    ? 'bg-amber-950/30 border-amber-500/60 shadow-sm'
                    : 'bg-stone-950/60 border-stone-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold truncate max-w-[130px]">
                    <span className="font-mono text-sm">{rankMedal}</span>
                    <span className={`truncate ${isMe ? 'text-amber-300' : 'text-stone-200'}`}>
                      {player.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-amber-400 bg-amber-950 px-1 rounded border border-amber-800/80">
                        我
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    {player.combo >= 5 && (
                      <span className="text-amber-400 flex items-center gap-0.5 font-bold animate-pulse">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {player.combo}
                      </span>
                    )}
                    <span className="text-stone-400">{player.cpm} CPM</span>
                  </div>
                </div>

                {/* 即時進度條 */}
                <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden relative border border-stone-800">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      player.isFinished
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : isMe
                        ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                        : 'bg-gradient-to-r from-stone-600 to-stone-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, player.overallPercent))}%` }}
                  />
                </div>

                {/* 底部題數與狀態 */}
                <div className="flex items-center justify-between mt-1 text-[10px] text-stone-500 font-mono">
                  <span>
                    進度: {player.questionIndex} / {totalQuestions} 題
                  </span>
                  {player.isFinished ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <Flag className="w-2.5 h-2.5" /> 完賽 ({player.finishTime}s)
                    </span>
                  ) : (
                    <span>{Math.round(player.overallPercent)}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 浮動戰況快訊 (Battle Events) */}
      <div className="h-6 mt-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout">
          {battleEvents.length > 0 && (
            <motion.div
              key={battleEvents[battleEvents.length - 1].id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xs font-medium text-amber-300/90 bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-800/40 flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{battleEvents[battleEvents.length - 1].text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
