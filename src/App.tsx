/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { Header } from './components/Header';
import { GameSetup } from './components/GameSetup';
import { TypingArena } from './components/TypingArena';
import { ResultModal } from './components/ResultModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { QuestionBankModal } from './components/QuestionBankModal';
import { InstructionModal } from './components/InstructionModal';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { MultiplayerBattleBar } from './components/MultiplayerBattleBar';
import { MultiplayerResultModal } from './components/MultiplayerResultModal';
import {
  Difficulty,
  QuestionCount,
  QuestionItem,
  GameStatus,
  GameMode,
  PlayerState,
  RoomSettings
} from './types';
import { getStoredQuestions, getRandomQuestions } from './data/questions';
import { isSoundEnabled, getVolume, setVolume, toggleSound } from './utils/audio';
import { P2PRoomManager } from './utils/p2p';

export default function App() {
  // 遊戲模式：'solo' (單人冒險) 或 'multiplayer' (多人連線對決 2-6 人)
  const [gameMode, setGameMode] = useState<GameMode>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('room') ? 'multiplayer' : 'solo';
  });

  // 單人與全域狀態
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [volume, setVolumeState] = useState<number>(() => getVolume());

  const handleVolumeChange = (newVol: number) => {
    const actualVol = setVolume(newVol);
    setVolumeState(actualVol);
    setSoundOn(actualVol > 0);
  };

  const handleToggleSound = () => {
    const newSoundOn = toggleSound();
    setSoundOn(newSoundOn);
    setVolumeState(getVolume());
  };

  // 題庫與當前回合題目
  const [questionBank, setQuestionBank] = useState<QuestionItem[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<QuestionItem[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // 單人結算數據
  const [latestStats, setLatestStats] = useState<{
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
  } | null>(null);

  // 多人連線專屬狀態
  const [multiplayerPlayers, setMultiplayerPlayers] = useState<PlayerState[]>([]);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    roomCode: '',
    maxPlayers: 4,
    difficulty: 'medium',
    questionCount: 10,
    status: 'waiting',
  });
  const [battleEvents, setBattleEvents] = useState<
    { id: string; text: string; type: 'clear' | 'combo' | 'finish' }[]
  >([]);
  const [multiplayerFinished, setMultiplayerFinished] = useState<boolean>(false);

  // P2P 管理器實例
  const p2pRef = useRef<P2PRoomManager | null>(null);
  if (!p2pRef.current) {
    p2pRef.current = new P2PRoomManager({});
  }
  const p2pManager = p2pRef.current;

  // 彈跳視窗狀態
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showQuestionBank, setShowQuestionBank] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  // 全域通知訊息
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // 題庫數量不足警告確認彈窗
  const [insufficientPrompt, setInsufficientPrompt] = useState<{
    isOpen: boolean;
    requiredCount: number;
    availableCount: number;
    onConfirm: () => void;
  } | null>(null);

  // 初始化載入題庫與音效設定
  useEffect(() => {
    const loaded = getStoredQuestions();
    setQuestionBank(loaded);
    setSoundOn(isSoundEnabled());
    setVolumeState(getVolume());
  }, []);

  // 綁定 P2P 全域事件回調
  useEffect(() => {
    const unsubscribe = p2pManager.addCallbacks({
      onPlayerListChange: (players, settings) => {
        setMultiplayerPlayers([...players]);
        setRoomSettings({ ...settings });
      },
      onGameStart: (questions, startTime) => {
        setActiveQuestions(questions);
        setCurrentQuestionIndex(0);
        setMultiplayerFinished(false);
        setGameStatus('playing');
        setBattleEvents([]);
      },
      onProgressUpdate: (playerId, update) => {
        setMultiplayerPlayers((prev) =>
          prev.map((p) => (p.id === playerId ? { ...p, ...update } : p))
        );
      },
      onBattleEvent: (text, type) => {
        const newEvent = { id: `${Date.now()}-${Math.random()}`, text, type };
        setBattleEvents((prev) => [...prev.slice(-3), newEvent]);
      },
      onReturnToLobby: () => {
        setMultiplayerFinished(false);
        setGameStatus('idle');
        setActiveQuestions([]);
        setCurrentQuestionIndex(0);
      },
      onDisconnected: (reason) => {
        setNoticeMessage(reason || '與房間連線已中斷');
        setMultiplayerFinished(false);
        setGameStatus('idle');
        setActiveQuestions([]);
        setCurrentQuestionIndex(0);
        setTimeout(() => setNoticeMessage(null), 4000);
      },
    });
    return unsubscribe;
  }, [p2pManager]);

  // === 單人模式開始 ===
  const handleStartSoloGame = () => {
    // 依指定題庫分類先進行過濾（若有勾選指定題庫）
    const categoryPool = selectedCategories.length > 0
      ? questionBank.filter((q) => selectedCategories.includes(q.category))
      : questionBank;

    const available = difficulty === 'all'
      ? categoryPool.length
      : categoryPool.filter((q) => q.difficulty === difficulty).length;

    // 當前題庫數量不足玩家選擇的題目數量時跳出警告
    if (available < questionCount || categoryPool.length < questionCount) {
      setInsufficientPrompt({
        isOpen: true,
        requiredCount: questionCount,
        availableCount: available,
        onConfirm: () => {
          setInsufficientPrompt(null);
          executeStartSoloGame();
        },
      });
      return;
    }
    executeStartSoloGame();
  };

  const executeStartSoloGame = () => {
    const selected = getRandomQuestions(questionBank, difficulty, questionCount, selectedCategories);
    setActiveQuestions(selected);
    setCurrentQuestionIndex(0);
    setLatestStats(null);
    setGameStatus('playing');
  };

  // === 多人模式：房主發起戰鬥 ===
  const handleStartMultiplayerBattle = () => {
    if (!p2pManager.isHost) return;
    const roomCats = roomSettings.selectedCategories || [];
    const categoryPool = roomCats.length > 0
      ? questionBank.filter((q) => roomCats.includes(q.category))
      : questionBank;

    const available = roomSettings.difficulty === 'all'
      ? categoryPool.length
      : categoryPool.filter((q) => q.difficulty === roomSettings.difficulty).length;

    // 當前題庫數量不足房主選擇的題目數量時跳出警告
    if (available < roomSettings.questionCount || categoryPool.length < roomSettings.questionCount) {
      setInsufficientPrompt({
        isOpen: true,
        requiredCount: roomSettings.questionCount,
        availableCount: available,
        onConfirm: () => {
          setInsufficientPrompt(null);
          executeStartMultiplayerBattle();
        },
      });
      return;
    }
    executeStartMultiplayerBattle();
  };

  const executeStartMultiplayerBattle = () => {
    const selected = getRandomQuestions(
      questionBank,
      roomSettings.difficulty,
      roomSettings.questionCount,
      roomSettings.selectedCategories
    );
    p2pManager.startGame(selected);
  };

  // 進入下一題
  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prev) => prev + 1);
    if (gameMode === 'multiplayer') {
      const me = multiplayerPlayers.find((p) => p.id === p2pManager.myPlayerId);
      const myName = me?.name || '我方戰士';
      p2pManager.sendBattleEvent(`⚡ ${myName} 擊破了第 ${currentQuestionIndex + 1} 題！`, 'clear');
    }
  };

  // 跳過題目處理：優先從符合指定分類與難度之未出題庫中補充全新題目，確保達成目標答對題數且絕不重複出現
  const handleSkipQuestion = (): { supplemented: boolean; remainingCount?: number } => {
    // 收集目前遊戲中所有出現過的題目文字與原始ID（去除 -skip- 與 -dup- 後綴）
    const activeTexts = new Set(activeQuestions.map((q) => q.text.trim()));
    const activeBaseIds = new Set(
      activeQuestions.map((q) => q.id.replace(/-skip-.*$/, '').replace(/-dup-.*$/, ''))
    );
    const activeCats = gameMode === 'multiplayer'
      ? (roomSettings.selectedCategories || [])
      : selectedCategories;

    // 1. 優先在指定分類池中篩選未出過的題目（依題目文字與原始ID雙重排除，確保絕不重複）
    const effectiveBank = activeCats.length > 0
      ? questionBank.filter((q) => activeCats.includes(q.category))
      : questionBank;

    const unpickedPool = effectiveBank.filter(
      (q) => !activeTexts.has(q.text.trim()) && !activeBaseIds.has(q.id.replace(/-skip-.*$/, '').replace(/-dup-.*$/, ''))
    );

    // 2. 若無任何未出過的新題目，嚴格遵守「絕不重複」原則：不補題、不重複循環舊題！
    if (unpickedPool.length === 0) {
      return { supplemented: false, remainingCount: 0 };
    }

    // 3. 嚴格鎖定同難度的新題，絕不跨難度替補（例如初級絕不替補中級或高級題目）
    const targetDifficulty = gameMode === 'multiplayer' ? roomSettings.difficulty : difficulty;
    let candidates = unpickedPool;
    if (targetDifficulty !== 'all') {
      candidates = unpickedPool.filter((q) => q.difficulty === targetDifficulty);
    }

    // 若指定難度已無任何未出過的新題目，嚴格遵守規則不進行跨難度替補
    if (candidates.length === 0) {
      return { supplemented: false, remainingCount: 0 };
    }

    // 4. 隨機挑選一道未出過的全新題目並補充至隊尾
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    if (!picked) {
      return { supplemented: false, remainingCount: 0 };
    }

    setActiveQuestions((prevActive) => {
      const isAlreadyIn = prevActive.some(
        (q) => q.text.trim() === picked.text.trim() ||
               q.id.replace(/-skip-.*$/, '').replace(/-dup-.*$/, '') === picked.id.replace(/-skip-.*$/, '').replace(/-dup-.*$/, '')
      );
      if (isAlreadyIn) return prevActive;
      return [...prevActive, { ...picked, id: `${picked.id}-skip-${Date.now()}` }];
    });

    return { supplemented: true, remainingCount: candidates.length - 1 };
  };

  // 單人/多人挑戰結算
  const handleFinishChallenge = (stats: {
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
  }) => {
    setLatestStats(stats);
    if (gameMode === 'multiplayer') {
      const me = multiplayerPlayers.find((p) => p.id === p2pManager.myPlayerId);
      const myName = me?.name || '我方戰士';
      p2pManager.sendBattleEvent(`🏆 ${myName} 已完成全部目標！`, 'finish');
      setMultiplayerFinished(true);
    } else {
      setGameStatus('completed');
    }
  };

  // 即時打字進度推播 (多人連線)
  const handleMultiplayerProgressTick = (data: {
    questionIndex: number;
    currentProgress: number;
    overallPercent: number;
    cpm: number;
    wpm: number;
    accuracy: number;
    combo: number;
    isFinished: boolean;
    finishTime?: number;
  }) => {
    if (gameMode !== 'multiplayer') return;
    p2pManager.sendMyProgress(data);

    // 當達成 10、20 等連擊時廣播戰訊
    if (data.combo > 0 && data.combo % 10 === 0) {
      const me = multiplayerPlayers.find((p) => p.id === p2pManager.myPlayerId);
      const myName = me?.name || '戰士';
      p2pManager.sendBattleEvent(`🔥 ${myName} 達成 ${data.combo} 連擊！`, 'combo');
    }
  };

  // 中途放棄返回主選單
  const handleQuitGame = () => {
    setGameStatus('idle');
    setActiveQuestions([]);
    setCurrentQuestionIndex(0);
    setLatestStats(null);
    setMultiplayerFinished(false);
  };

  // 重新再來一局 (單人)
  const handlePlayAgainSolo = () => {
    handleStartSoloGame();
  };

  // 多人房主讓全員回到房間大廳準備下一場
  const handleReturnToMultiplayerLobby = () => {
    p2pManager.returnToLobby();
  };

  // 退出多人模式回到單人
  const handleQuitMultiplayer = () => {
    p2pManager.destroy();
    setGameMode('solo');
    setGameStatus('idle');
    setMultiplayerFinished(false);
  };

  return (
    <div className="h-screen max-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden overflow-y-auto sm:overflow-y-hidden">
      {/* Global Navigation Header */}
      <Header
        soundOn={soundOn}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onToggleSound={handleToggleSound}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        onOpenQuestionBank={() => setShowQuestionBank(true)}
        onOpenInstructions={() => setShowInstructions(true)}
        onGoHome={handleQuitGame}
        isPlaying={gameStatus === 'playing'}
      />

      {/* Main Game Stage */}
      <main className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2.5 w-full relative min-h-0 overflow-y-auto sm:overflow-y-hidden">
        {/* 連線通知 Toast */}
        <AnimatePresence>
          {noticeMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 z-50 px-5 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold shadow-xl flex items-center gap-2 border border-amber-400"
            >
              <span>🔔 {noticeMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === 1. 單人模式主畫面 === */}
        {gameMode === 'solo' && gameStatus === 'idle' && (
          <GameSetup
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            questionCount={questionCount}
            setQuestionCount={setQuestionCount}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            onStartGame={handleStartSoloGame}
            questionBank={questionBank}
            onSwitchToMultiplayer={() => setGameMode('multiplayer')}
          />
        )}

        {/* === 2. 多人連線大廳 (開房隨機 6 位密碼 / 輸入密碼加入 2-6 人) === */}
        {gameMode === 'multiplayer' && gameStatus === 'idle' && (
          <MultiplayerLobby
            p2pManager={p2pManager}
            onStartBattle={handleStartMultiplayerBattle}
            onExitMultiplayer={handleQuitMultiplayer}
            soundOn={soundOn}
            questionBank={questionBank}
          />
        )}

        {/* === 3. 戰鬥射擊主競技場 (單人或多人皆使用) === */}
        {gameStatus === 'playing' && activeQuestions.length > 0 && (
          <TypingArena
            questions={activeQuestions}
            questionIndex={currentQuestionIndex}
            onNextQuestion={handleNextQuestion}
            onSkipQuestion={handleSkipQuestion}
            onFinishChallenge={handleFinishChallenge}
            onQuit={handleQuitGame}
            isMultiplayer={gameMode === 'multiplayer'}
            onProgressTick={handleMultiplayerProgressTick}
            multiplayerHeader={
              gameMode === 'multiplayer' ? (
                <MultiplayerBattleBar
                  players={multiplayerPlayers}
                  myPlayerId={p2pManager.myPlayerId}
                  totalQuestions={activeQuestions.length}
                  battleEvents={battleEvents}
                />
              ) : null
            }
          />
        )}

        {/* === 4. 單人結算畫面 === */}
        {gameMode === 'solo' && gameStatus === 'completed' && latestStats && (
          <ResultModal
            stats={latestStats}
            difficulty={difficulty}
            questionCount={questionCount}
            destroyedCount={latestStats.destroyedCount}
            totalQuestionsCount={latestStats.totalQuestionsCount || activeQuestions.length || questionCount}
            selectedCategories={selectedCategories}
            onPlayAgain={handlePlayAgainSolo}
            onGoHome={handleQuitGame}
            onViewLeaderboard={() => setShowLeaderboard(true)}
          />
        )}

        {/* === 5. 多人連線賽後頒獎台 === */}
        {gameMode === 'multiplayer' && multiplayerFinished && (
          <MultiplayerResultModal
            players={multiplayerPlayers}
            myPlayerId={p2pManager.myPlayerId}
            isHost={p2pManager.isHost}
            settings={roomSettings}
            onReturnToLobby={handleReturnToMultiplayerLobby}
            onQuitMultiplayer={handleQuitMultiplayer}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-900 py-3 text-center text-xs text-stone-500">
      </footer>

      {/* Modals */}
      {showInstructions && (
        <InstructionModal
          onClose={() => setShowInstructions(false)}
          onOpenMultiplayer={() => {
            setShowInstructions(false);
            setGameMode('multiplayer');
          }}
          onOpenQuestionBank={() => {
            setShowInstructions(false);
            setShowQuestionBank(true);
          }}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}

      {showQuestionBank && (
        <QuestionBankModal
          currentQuestions={questionBank}
          onUpdateQuestions={(newQuestions) => setQuestionBank(newQuestions)}
          onClose={() => setShowQuestionBank(false)}
        />
      )}

      {/* 題庫數量不足警告確認彈窗 */}
      {insufficientPrompt && insufficientPrompt.isOpen && (
        <div
          id="modal-insufficient-questions"
          className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setInsufficientPrompt(null)}
        >
          <div
            id="dialog-insufficient-questions"
            className="w-full max-w-lg sm:max-w-xl bg-stone-900 border border-amber-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-stone-100 whitespace-nowrap overflow-hidden text-ellipsis">
                  符合條件之題目僅有 {insufficientPrompt.availableCount} 題（設定目標為 {insufficientPrompt.requiredCount} 題）
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                  若確定繼續，將直接以這 {insufficientPrompt.availableCount} 道題目開始遊戲。
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-800">
              <button
                id="btn-cancel-insufficient"
                type="button"
                onClick={() => setInsufficientPrompt(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                返回調整
              </button>
              <button
                id="btn-confirm-insufficient"
                type="button"
                onClick={insufficientPrompt.onConfirm}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                以 {insufficientPrompt.availableCount} 題開始挑戰
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
