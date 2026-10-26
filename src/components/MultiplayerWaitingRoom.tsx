import React from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Zap,
  CheckCircle2,
  Trophy,
  Flame,
  Radio,
  Hourglass,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { PlayerState, RoomSettings } from '../types';

interface MultiplayerWaitingRoomProps {
  players: PlayerState[];
  myPlayerId: string;
  isHost: boolean;
  settings: RoomSettings;
  secondsLeft: number;
  onForceSettle: () => void;
  onQuit?: () => void;
}

export const MultiplayerWaitingRoom: React.FC<MultiplayerWaitingRoomProps> = ({
  players,
  myPlayerId,
  isHost,
  settings,
  secondsLeft,
  onForceSettle,
  onQuit,
}) => {
  // 排序玩家：已完賽依用時與CPM排序，未完賽依進度與CPM排序
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

  const me = players.find((p) => p.id === myPlayerId);
  const myRank = sortedPlayers.findIndex((p) => p.id === myPlayerId) + 1;

  const finishedPlayers = sortedPlayers.filter((p) => p.isFinished);
  const activePlayers = sortedPlayers.filter((p) => !p.isFinished);

  const initialSecondsRef = React.useRef<number>(Math.max(secondsLeft, 30));
  React.useEffect(() => {
    if (secondsLeft > initialSecondsRef.current) {
      initialSecondsRef.current = secondsLeft;
    }
  }, [secondsLeft]);

  const countdownPercent = Math.max(0, Math.min(100, (secondsLeft / Math.max(initialSecondsRef.current, 1)) * 100));
  const isUrgent = secondsLeft <= 10;

  return (
    <div
      id="multiplayer-waiting-monitor"
      className="fixed inset-0 z-50 flex justify-center items-start sm:items-center p-2.5 sm:p-6 bg-stone-950/90 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-stone-900 border-2 border-amber-500/50 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-stone-100 relative my-auto space-y-4 sm:space-y-5"
      >
        {/* 頂部戰情中心標頭 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              戰情即時監控中心 · 多人對決結算等待
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
              <span>🎯 挑戰達成！等待其他選手抵達終點</span>
            </h2>
            <p className="text-xs text-stone-400">
              全員完賽、超時寬限倒數歸零或房主提前結算時，將同步開啟全體頒獎台！
            </p>
          </div>

          {/* 超時自動倒數計時器 */}
          <div className="flex items-center gap-3 bg-stone-950/80 border border-stone-800 rounded-xl px-3.5 py-2 shrink-0">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-10 h-10 -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  className="stroke-stone-800 fill-none"
                  strokeWidth="3"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  className={`fill-none transition-all duration-1000 ${
                    isUrgent ? 'stroke-rose-500' : 'stroke-amber-400'
                  }`}
                  strokeWidth="3"
                  strokeDasharray={100}
                  strokeDashoffset={100 - countdownPercent}
                  strokeLinecap="round"
                />
              </svg>
              <span
                className={`absolute font-mono font-bold text-xs ${
                  isUrgent ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                }`}
              >
                {secondsLeft}s
              </span>
            </div>

            <div className="text-left text-xs font-mono">
              <div className="text-stone-400 flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3 text-amber-400" />
                超時自動結算
              </div>
              <div className="text-stone-200 font-bold">
                剩餘 <span className={isUrgent ? 'text-rose-400 font-black' : 'text-amber-400'}>{secondsLeft}</span> 秒
              </div>
            </div>
          </div>
        </div>

        {/* 我方個人戰績速報 */}
        {me && (
          <div className="bg-gradient-to-r from-amber-950/40 via-stone-900/80 to-stone-950/90 border border-amber-500/40 rounded-xl p-3 sm:p-4 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎖️'}
                </span>
                <span className="font-bold text-amber-300 text-sm sm:text-base">
                  我方成績速報 ({me.name})
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-mono border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  已就緒 (暫列第 {myRank} 名)
                </span>
              </div>

              {me.finishTime !== null && me.finishTime !== undefined && (
                <div className="font-mono text-xs text-stone-300 bg-stone-950/60 px-2.5 py-1 rounded-lg border border-stone-800">
                  完賽用時：<strong className="text-amber-400">{me.finishTime}</strong> 秒
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div className="bg-stone-950/60 rounded-lg p-2 border border-stone-800/80 text-center">
                <span className="text-stone-400 text-[10px] block">打字速度</span>
                <span className="font-bold text-amber-400 text-sm sm:text-base">{me.cpm}</span>
                <span className="text-stone-500 text-[9px] block">CPM</span>
              </div>
              <div className="bg-stone-950/60 rounded-lg p-2 border border-stone-800/80 text-center">
                <span className="text-stone-400 text-[10px] block">準確率</span>
                <span className="font-bold text-emerald-400 text-sm sm:text-base">{me.accuracy}%</span>
                <span className="text-stone-500 text-[9px] block">命中率</span>
              </div>
              <div className="bg-stone-950/60 rounded-lg p-2 border border-stone-800/80 text-center">
                <span className="text-stone-400 text-[10px] block">最高連擊</span>
                <span className="font-bold text-orange-400 text-sm sm:text-base">{me.combo}</span>
                <span className="text-stone-500 text-[9px] block">COMBO</span>
              </div>
              <div className="hidden sm:block bg-stone-950/60 rounded-lg p-2 border border-stone-800/80 text-center">
                <span className="text-stone-400 text-[10px] block">完成度</span>
                <span className="font-bold text-sky-400 text-sm sm:text-base">100%</span>
                <span className="text-stone-500 text-[9px] block">{settings.questionCount} 題全破</span>
              </div>
            </div>
          </div>
        )}

        {/* 選手即時戰況矩陣 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold">
            <span className="flex items-center gap-1.5 text-stone-200">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              全體選手進度監控 ({finishedPlayers.length}/{players.length} 已完賽)
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              模式：{settings.questionCount} 題 ·{' '}
              {settings.difficulty === 'easy'
                ? '初級短語'
                : settings.difficulty === 'medium'
                ? '中級名句'
                : settings.difficulty === 'hard'
                ? '高級長句'
                : '綜合題庫'}
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {/* 1. 已完賽選手清單 */}
            {finishedPlayers.map((player, idx) => {
              const isMe = player.id === myPlayerId;
              const rank = idx + 1;
              return (
                <div
                  key={player.id}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isMe
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-sm'
                      : 'bg-stone-950/70 border-emerald-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 text-center font-mono font-bold text-sm text-stone-300">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm truncate">
                        <span className={isMe ? 'text-amber-300' : 'text-stone-100'}>
                          {player.name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            我
                          </span>
                        )}
                        {player.isHost && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-stone-800 text-stone-400 border border-stone-700">
                            房主
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono flex items-center gap-2">
                        <span>速度: {player.cpm} CPM</span>
                        <span>準確率: {player.accuracy}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs text-amber-400 font-bold bg-stone-900 px-2 py-1 rounded border border-stone-800">
                      {player.finishTime !== null && player.finishTime !== undefined
                        ? `${player.finishTime} 秒`
                        : '完賽'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      完賽就緒
                    </span>
                  </div>
                </div>
              );
            })}

            {/* 2. 奮戰衝刺中選手清單 */}
            {activePlayers.map((player) => {
              const isMe = player.id === myPlayerId;
              const percent = Math.min(100, Math.max(0, player.overallPercent));
              return (
                <div
                  key={player.id}
                  className="p-2.5 sm:p-3 rounded-xl border border-stone-800 bg-stone-950/80 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                      <span className="font-bold text-xs sm:text-sm text-stone-200 truncate">
                        {player.name}
                      </span>
                      {player.isHost && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-stone-800 text-stone-400 border border-stone-700">
                          房主
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        <Zap className="w-3 h-3" />
                        {player.cpm} CPM
                      </span>
                      <span className="text-stone-400">
                        進度: 第 {Math.min(player.questionIndex + 1, settings.questionCount)} / {settings.questionCount} 題
                      </span>
                    </div>
                  </div>

                  {/* 即時進度動態條 */}
                  <div className="space-y-1">
                    <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono">
                      <span>打字衝刺中...</span>
                      <span>{Math.round(percent)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部功能與操作區 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-800">
          <div className="text-xs text-stone-400 flex items-center gap-1.5 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isHost
                ? '身為房主，若其他玩家落後或掛機，您可隨時點擊「提前強制結算」'
                : '房主具備手動提前結算權限，或待倒數結束全員一同揭曉名次'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* 房主專屬：提前強制結算按鈕 */}
            {isHost && (
              <button
                id="btn-host-force-settle"
                type="button"
                onClick={onForceSettle}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-stone-950" />
                <span>提前強制結算</span>
              </button>
            )}

            {onQuit && (
              <button
                id="btn-quit-waiting-room"
                type="button"
                onClick={onQuit}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
              >
                退出房間
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
