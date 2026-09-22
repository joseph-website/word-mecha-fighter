import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Crown,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Share2,
  Play,
  ArrowLeft,
  Settings,
  Shield,
  Zap,
  Sparkles,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { PlayerState, RoomSettings, Difficulty, QuestionCount } from '../types';
import { P2PRoomManager } from '../utils/p2p';

interface MultiplayerLobbyProps {
  p2pManager: P2PRoomManager;
  onStartBattle: () => void;
  onExitMultiplayer: () => void;
  soundOn: boolean;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  p2pManager,
  onStartBattle,
  onExitMultiplayer,
}) => {
  // 狀態：'menu' (選擇開房或加入), 'in_lobby' (在房間大廳中)
  const [lobbyView, setLobbyView] = useState<'menu' | 'in_lobby'>(() => {
    return p2pManager.roomCode ? 'in_lobby' : 'menu';
  });
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // 表單輸入
  const [playerName, setPlayerName] = useState<string>(() => {
    // 檢查若使用者之前存留的是預設前綴「鍵客_」，將其清除，否則讀取自訂暱稱或預設為空字串
    const stored = localStorage.getItem('chinese_typing_player_name');
    if (stored && (stored.startsWith('鍵客_') || stored === '打字俠客')) {
      try { localStorage.removeItem('chinese_typing_player_name'); } catch {}
      return '';
    }
    return stored || '';
  });
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);

  // 載入中與錯誤反饋
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // 房間與玩家即時狀態
  const [roomSettings, setRoomSettings] = useState<RoomSettings>(p2pManager.settings);
  const [players, setPlayers] = useState<PlayerState[]>(p2pManager.players);

  // 儲存玩家暱稱
  useEffect(() => {
    if (playerName.trim()) {
      localStorage.setItem('chinese_typing_player_name', playerName.trim());
    }
  }, [playerName]);

  // 檢查 URL query 是否有帶 room code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomParam.length === 6) {
      setJoinCodeInput(roomParam);
      setActiveTab('join');
    }
  }, []);

  // 綁定 P2P 回調
  useEffect(() => {
    const unsubscribe = p2pManager.addCallbacks({
      onPlayerListChange: (updatedPlayers, updatedSettings) => {
        setPlayers([...updatedPlayers]);
        setRoomSettings({ ...updatedSettings });
      },
      onError: (err) => {
        setErrorMessage(err);
        setIsConnecting(false);
      },
      onDisconnected: (reason) => {
        setErrorMessage(reason);
        setLobbyView('menu');
      },
      onReturnToLobby: () => {
        setLobbyView('in_lobby');
      },
    });
    return unsubscribe;
  }, [p2pManager]);

  // === 房主建立房間 ===
  const handleCreateRoom = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      await p2pManager.createRoom(playerName, {
        maxPlayers,
        difficulty,
        questionCount,
      });
      setPlayers([...p2pManager.players]);
      setRoomSettings({ ...p2pManager.settings });
      setLobbyView('in_lobby');
    } catch (err: any) {
      setErrorMessage(err?.message || '建立房間失敗，請檢查網路連線');
    } finally {
      setIsConnecting(false);
    }
  };

  // === 訪客加入房間 ===
  const handleJoinRoom = async () => {
    const cleanCode = joinCodeInput.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setErrorMessage('請輸入正確的 6 位數字房間密碼');
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);
    try {
      await p2pManager.joinRoom(cleanCode, playerName);
      setPlayers([...p2pManager.players]);
      setRoomSettings({ ...p2pManager.settings });
      setLobbyView('in_lobby');
    } catch (err: any) {
      setErrorMessage(err?.message || '無法連線到該房間，請確認 6 位數密碼是否正確');
    } finally {
      setIsConnecting(false);
    }
  };

  // 複製 6 位數房間密碼
  const handleCopyCode = () => {
    if (!roomSettings.roomCode) return;
    navigator.clipboard.writeText(roomSettings.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 複製專屬邀請連結
  const handleCopyInviteLink = () => {
    if (!roomSettings.roomCode) return;
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomSettings.roomCode);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // 切換準備狀態 (Guest)
  const handleToggleReady = () => {
    const me = players.find((p) => p.id === p2pManager.myPlayerId);
    if (me) {
      p2pManager.setReady(!me.isReady);
      setPlayers([...p2pManager.players]);
    }
  };

  // 房主更改房間難度或題數
  const handleUpdateHostSettings = (newDiff: Difficulty, newCount: QuestionCount, newMax: number) => {
    if (!p2pManager.isHost) return;
    p2pManager.updateRoomSettings({
      difficulty: newDiff,
      questionCount: newCount,
      maxPlayers: newMax,
    });
    setDifficulty(newDiff);
    setQuestionCount(newCount);
    setMaxPlayers(newMax);
  };

  // 離開房間
  const handleLeaveRoom = () => {
    p2pManager.destroy();
    setLobbyView('menu');
  };

  const isHost = p2pManager.isHost;
  const myPlayer = players.find((p) => p.id === p2pManager.myPlayerId);
  const allGuestsReady = players.filter((p) => !p.isHost).every((p) => p.isReady);
  const canStartGame = isHost && players.length >= 2 && allGuestsReady;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* 頂部返回 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={lobbyView === 'in_lobby' ? handleLeaveRoom : onExitMultiplayer}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-300 text-sm transition-colors border border-stone-800"
        >
          <ArrowLeft className="w-4 h-4" />
          {lobbyView === 'in_lobby' ? '退出房間' : '返回單人模式'}
        </button>
      </div>

      {/* 錯誤提示 */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 flex items-start gap-3 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-rose-300">連線提醒</div>
              <div className="text-rose-300/80 mt-0.5">{errorMessage}</div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 text-xs underline ml-2"
            >
              關閉
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === 視圖 1: 開房 / 加入選單 === */}
      {lobbyView === 'menu' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-wider text-amber-300 flex items-center justify-center gap-3">
              <Users className="w-8 h-8 text-amber-400" />
              多人即時連線對戰 (2-6人)
            </h2>
            <p className="text-stone-400 text-sm mt-2">
              無需任何伺服器帳號，輸入 6 位數字密碼即刻開戰！
            </p>
          </div>

          {/* 玩家暱稱輸入 */}
          <div className="max-w-md mx-auto mb-8">
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              你的戰士稱號 (暱稱)
            </label>
            <div className="relative">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 12))}
                maxLength={12}
                placeholder="請輸入暱稱"
                className="w-full px-4 py-3 bg-stone-950/80 border border-stone-700 rounded-xl text-stone-100 font-medium focus:outline-none focus:border-amber-500 transition-colors text-center text-lg"
              />
            </div>
          </div>

          {/* 開房 / 加入 分頁切換 */}
          <div className="flex max-w-md mx-auto bg-stone-950 p-1.5 rounded-xl border border-stone-800 mb-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Crown className="w-4 h-4" />
              建立新房間 (房主)
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'join'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Users className="w-4 h-4" />
              輸入密碼加入
            </button>
          </div>

          {/* 分頁 A: 建立新房間 */}
          {activeTab === 'create' && (
            <div className="space-y-6 max-w-xl mx-auto">
              {/* 人數上限設定 (2-6人) */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>連線人數上限 (2 ~ 6 人)</span>
                  <span className="text-amber-400 font-mono text-sm">{maxPlayers} 人戰鬥</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxPlayers(num)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                        maxPlayers === num
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-md scale-102'
                          : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {num} 人
                    </button>
                  ))}
                </div>
              </div>

              {/* 難度設定 */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  題庫難度選擇
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'easy', label: '初級短語' },
                    { id: 'medium', label: '中級名句' },
                    { id: 'hard', label: '高級長句' },
                    { id: 'all', label: '綜合模式' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDifficulty(item.id as Difficulty)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-medium transition-all text-center ${
                        difficulty === item.id
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm'
                          : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 題數設定 */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  回合挑戰題數
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { count: 5, label: '5 題閃擊戰' },
                    { count: 10, label: '10 題標準賽' },
                    { count: 20, label: '20 題耐力賽' },
                  ].map((item) => (
                    <button
                      key={item.count}
                      type="button"
                      onClick={() => setQuestionCount(item.count as QuestionCount)}
                      className={`py-2.5 rounded-xl border text-xs font-medium transition-all text-center ${
                        questionCount === item.count
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm'
                          : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 開房送出按鈕 */}
              <button
                onClick={handleCreateRoom}
                disabled={isConnecting || !playerName.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-lg shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    正在布置房間...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    產生 6 位數房間密碼並開房
                  </>
                )}
              </button>
            </div>
          )}

          {/* 分頁 B: 加入現有房間 */}
          {activeTab === 'join' && (
            <div className="space-y-6 max-w-md mx-auto">
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 text-center">
                  請輸入房主提供的 6 位數字房間密碼
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="請輸入密碼"
                    className="w-full px-4 py-3 bg-stone-950/80 border border-stone-700 rounded-xl text-stone-100 font-medium focus:outline-none focus:border-amber-500 transition-colors text-center text-lg"
                  />
                </div>
                <p className="text-center text-xs text-stone-500 mt-2">
                  提示：向房主索取 6 位數號碼或直接點擊房主分享的專屬連結加入。
                </p>
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={isConnecting || joinCodeInput.trim().length !== 6 || !playerName.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-lg shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    正在進入房間...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    加入對戰房間
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* === 視圖 2: 房間大廳 (已開房/已加入) === */}
      {lobbyView === 'in_lobby' && (
        <div className="space-y-6">
          {/* 6 位數房間代碼展示卡片 */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/30 border-2 border-amber-500/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-amber-400/80 font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  專屬房間 6 位數密碼 (ROOM CODE)
                </div>
                <div className="text-4xl sm:text-5xl font-mono font-black text-amber-300 tracking-widest mt-2 flex items-center">
                  <span>{roomSettings.roomCode}</span>
                </div>
                <div className="text-xs text-stone-400 mt-2">
                  好友只要在「加入房間」輸入此 6 位號碼，即可點對點連線進入！
                </div>
              </div>

              {/* 複製按鈕群 */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedCode ? '已複製密碼！' : '複製 6 位密碼'}
                </button>
                <button
                  onClick={handleCopyInviteLink}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-sm border border-stone-700 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  {copiedLink ? '已複製連結！' : '複製邀請連結'}
                </button>
              </div>
            </div>

            {/* 房間當前規則標籤 */}
            <div className="mt-4 pt-4 border-t border-stone-800 flex flex-wrap items-center gap-3 text-xs">
              <span className="bg-stone-950/80 px-3 py-1 rounded-full border border-stone-800 text-stone-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                上限 {roomSettings.maxPlayers} 人 (目前 {players.length} 人)
              </span>
              <span className="bg-stone-950/80 px-3 py-1 rounded-full border border-stone-800 text-stone-300">
                難度: {
                  roomSettings.difficulty === 'easy' ? '初級短語' :
                  roomSettings.difficulty === 'medium' ? '中級名句' :
                  roomSettings.difficulty === 'hard' ? '高級長句' : '綜合全隨機'
                }
              </span>
              <span className="bg-stone-950/80 px-3 py-1 rounded-full border border-stone-800 text-stone-300">
                題數: {roomSettings.questionCount} 題
              </span>
            </div>
          </div>

          {/* 玩家列表卡片 (支援 2-6 人) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-200 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                已加入戰士名單 ({players.length} / {roomSettings.maxPlayers})
              </h3>
              <div className="text-xs text-stone-400">
                {isHost ? '等待全員準備後開戰' : '請點擊下方準備按鈕'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {players.map((p, idx) => {
                const isMe = p.id === p2pManager.myPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                      isMe
                        ? 'bg-amber-950/20 border-amber-500/50 shadow-sm'
                        : 'bg-stone-950/70 border-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-amber-400 font-mono text-base">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-stone-200 text-sm flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isMe && <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">我</span>}
                          {p.isHost && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-400" /> 房主
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {p.isHost ? '房間主持裁判' : '連線挑戰者'}
                        </div>
                      </div>
                    </div>

                    {/* 準備狀態 */}
                    <div>
                      {p.isHost ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" /> 房主就緒
                        </span>
                      ) : p.isReady ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 已就緒
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-stone-800 text-stone-400 border border-stone-700 text-xs font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> 等待中
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 空位插槽 (顯示還能加入幾人) */}
              {Array.from({ length: Math.max(0, roomSettings.maxPlayers - players.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-4 rounded-xl border border-dashed border-stone-800/80 bg-stone-950/30 flex items-center justify-center text-xs text-stone-600 gap-2"
                >
                  <Users className="w-4 h-4 opacity-50" />
                  等待第 {players.length + i + 1} 位玩家加入...
                </div>
              ))}
            </div>
          </div>

          {/* 底部操作面板 */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-stone-400 text-center sm:text-left">
              {isHost ? (
                <span>
                  {players.length < 2
                    ? '⚠️ 至少需要 2 人加入房間方可啟動對戰。'
                    : !allGuestsReady
                    ? '⏳ 尚有玩家未點擊「準備就緒」，等待中...'
                    : '🎉 全員就緒！點擊右側按鈕即刻同步開戰！'}
                </span>
              ) : (
                <span>
                  {myPlayer?.isReady
                    ? '✅ 您已就緒，請等待房主啟動遊戲！'
                    : '💡 請確認準備好鍵盤後，點擊「準備就緒」！'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!isHost ? (
                <button
                  onClick={handleToggleReady}
                  className={`flex-1 sm:flex-none px-8 py-3.5 rounded-xl font-bold text-base transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                    myPlayer?.isReady
                      ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20'
                  }`}
                >
                  {myPlayer?.isReady ? (
                    <>
                      <Clock className="w-5 h-5" /> 取消準備
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> 準備就緒！
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={onStartBattle}
                  disabled={!canStartGame}
                  className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-base shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  全員出擊 · 開始對戰！
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
