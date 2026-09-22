import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Medal, RotateCcw, Home, Crown, Flame, Zap, ArrowRight, Flag } from 'lucide-react';
import { PlayerState, RoomSettings } from '../types';

interface MultiplayerResultModalProps {
  players: PlayerState[];
  myPlayerId: string;
  isHost: boolean;
  settings: RoomSettings;
  onReturnToLobby: () => void;
  onQuitMultiplayer: () => void;
}

export const MultiplayerResultModal: React.FC<MultiplayerResultModalProps> = ({
  players,
  myPlayerId,
  isHost,
  settings,
  onReturnToLobby,
  onQuitMultiplayer,
}) => {
  // 按照完成題目進度與時間排序
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

  const myRank = sortedPlayers.findIndex((p) => p.id === myPlayerId) + 1;
  const isWinner = myRank === 1;

  // 優勝特效
  useEffect(() => {
    confetti({
      particleCount: isWinner ? 120 : 60,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#fbbf24', '#10b981', '#6366f1'],
    });
  }, [isWinner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-stone-900 border-2 border-amber-500/40 rounded-2xl shadow-2xl p-6 sm:p-8 text-stone-100 relative my-8"
      >
        {/* 頂部稱號 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-semibold mb-3 font-mono">
            <Trophy className="w-4 h-4" />
            多人對決賽後頒獎典禮 · {players.length} 人競賽
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-wider text-amber-300">
            {isWinner ? '👑 恭喜奪冠！全場第一！' : `🎉 完成對決！榮獲第 ${myRank} 名！`}
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            挑戰模式: {settings.questionCount} 題 ·{' '}
            {settings.difficulty === 'easy'
              ? '初級短語'
              : settings.difficulty === 'medium'
              ? '中級名句'
              : settings.difficulty === 'hard'
              ? '高級長句'
              : '綜合模式'}
          </p>
        </div>

        {/* 頒獎台 前三名 (Podium) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 pt-4">
          {/* 第 2 名 */}
          <div className="flex flex-col items-center justify-end">
            {sortedPlayers[1] ? (
              <div className="text-center w-full">
                <div className="text-xl sm:text-2xl mb-1">🥈</div>
                <div className="text-xs font-bold truncate px-1 text-stone-300">
                  {sortedPlayers[1].name}
                  {sortedPlayers[1].id === myPlayerId && ' (我)'}
                </div>
                <div className="text-[11px] text-stone-400 font-mono">
                  {sortedPlayers[1].cpm} CPM
                </div>
                <div className="h-16 sm:h-20 bg-stone-800 border-t-2 border-stone-400 rounded-t-xl flex items-center justify-center font-black text-stone-400 text-lg mt-2 shadow-inner">
                  2
                </div>
              </div>
            ) : (
              <div className="h-16 w-full bg-stone-900/50 rounded-t-xl" />
            )}
          </div>

          {/* 第 1 名 (冠軍) */}
          <div className="flex flex-col items-center justify-end">
            {sortedPlayers[0] && (
              <div className="text-center w-full">
                <div className="text-3xl sm:text-4xl mb-1 animate-bounce">🥇</div>
                <div className="text-sm font-black truncate px-1 text-amber-300">
                  {sortedPlayers[0].name}
                  {sortedPlayers[0].id === myPlayerId && ' (我)'}
                </div>
                <div className="text-xs text-amber-400 font-mono font-bold">
                  {sortedPlayers[0].cpm} CPM
                </div>
                <div className="h-24 sm:h-28 bg-gradient-to-t from-amber-600/30 to-amber-500/20 border-t-4 border-amber-400 rounded-t-xl flex items-center justify-center font-black text-amber-300 text-2xl mt-2 shadow-lg">
                  1
                </div>
              </div>
            )}
          </div>

          {/* 第 3 名 */}
          <div className="flex flex-col items-center justify-end">
            {sortedPlayers[2] ? (
              <div className="text-center w-full">
                <div className="text-xl sm:text-2xl mb-1">🥉</div>
                <div className="text-xs font-bold truncate px-1 text-amber-700">
                  {sortedPlayers[2].name}
                  {sortedPlayers[2].id === myPlayerId && ' (我)'}
                </div>
                <div className="text-[11px] text-stone-400 font-mono">
                  {sortedPlayers[2].cpm} CPM
                </div>
                <div className="h-12 sm:h-16 bg-stone-800 border-t-2 border-amber-700 rounded-t-xl flex items-center justify-center font-black text-amber-700 text-lg mt-2 shadow-inner">
                  3
                </div>
              </div>
            ) : (
              <div className="h-12 w-full bg-stone-900/50 rounded-t-xl" />
            )}
          </div>
        </div>

        {/* 全體排行榜表格 */}
        <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 mb-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 font-semibold">
                <th className="pb-2 px-2">排名</th>
                <th className="pb-2 px-2">玩家</th>
                <th className="pb-2 px-2 text-right">完賽時間</th>
                <th className="pb-2 px-2 text-right">CPM 速度</th>
                <th className="pb-2 px-2 text-right">準確率</th>
                <th className="pb-2 px-2 text-right">最高連擊</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono">
              {sortedPlayers.map((player, idx) => {
                const isMe = player.id === myPlayerId;
                return (
                  <tr
                    key={player.id}
                    className={`${isMe ? 'bg-amber-950/30 text-amber-200' : 'text-stone-300'}`}
                  >
                    <td className="py-2.5 px-2 font-bold">
                      {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                    </td>
                    <td className="py-2.5 px-2 font-sans font-medium flex items-center gap-1.5">
                      <span className="truncate max-w-[120px]">{player.name}</span>
                      {isMe && (
                        <span className="text-[10px] text-amber-400 bg-amber-950 px-1 rounded border border-amber-800">
                          我
                        </span>
                      )}
                      {player.isHost && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {player.isFinished ? `${player.finishTime}s` : '未完賽'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-amber-400">
                      {player.cpm}
                    </td>
                    <td className="py-2.5 px-2 text-right">{player.accuracy}%</td>
                    <td className="py-2.5 px-2 text-right">{player.combo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 底部按鈕 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={onQuitMultiplayer}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium text-sm flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            退出多人連線
          </button>

          {isHost ? (
            <button
              onClick={onReturnToLobby}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              回到房間準備下局 (全員同步)
            </button>
          ) : (
            <div className="text-xs text-stone-400 flex items-center gap-2 py-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              等待房主開啟下一局...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
