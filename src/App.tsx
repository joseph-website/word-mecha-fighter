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
import { MultiplayerBattleBar } from './components/MultiplayerBattleBar';

// 輕量化與按需載入：次要彈窗與連線模組透過 React.lazy 動態拆分，大幅縮減初始載入體積，保證遊玩與打字極速順暢
const ResultModal = React.lazy(() => import('./components/ResultModal').then((m) => ({ default: m.ResultModal })));
const LeaderboardModal = React.lazy(() => import('./components/LeaderboardModal').then((m) => ({ default: m.LeaderboardModal })));
const QuestionBankModal = React.lazy(() => import('./components/QuestionBankModal').then((m) => ({ default: m.QuestionBankModal })));
const InstructionModal = React.lazy(() => import('./components/InstructionModal').then((m) => ({ default: m.InstructionModal })));
const MultiplayerLobby = React.lazy(() => import('./components/MultiplayerLobby').then((m) => ({ default: m.MultiplayerLobby })));
const MultiplayerResultModal = React.lazy(() => import('./components/MultiplayerResultModal').then((m) => ({ default: m.MultiplayerResultModal })));
const MultiplayerWaitingRoom = React.lazy(() => import('./components/MultiplayerWaitingRoom').then((m) => ({ default: m.MultiplayerWaitingRoom })));
import {
  Difficulty,
  QuestionCount,
  QuestionItem,
  GameStatus,
  GameMode,
  PlayerState,
  RoomSettings,
  RoundReviewItem
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
    roundReviews?: RoundReviewItem[];
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
  const [myFinishedInMultiplayer, setMyFinishedInMultiplayer] = useState<boolean>(false);
  const [settlementCountdown, setSettlementCountdown] = useState<number>(30);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);
  const countdownTimerRef = useRef<number | null>(null);

  const clearSettlementTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const startSettlementCountdown = (customGraceSec?: number) => {
    if (countdownTimerRef.current) return;
    const duration = customGraceSec || settlementCountdown || 30;
    setSettlementCountdown(duration);
    p2pManager.sendSettlementCountdown(duration);

    let currentSec = duration;
    countdownTimerRef.current = window.setInterval(() => {
      currentSec -= 1;
      setSettlementCountdown(currentSec);
      p2pManager.sendSettlementCountdown(currentSec);

      if (currentSec <= 0) {
        clearSettlementTimer();
        p2pManager.sendAllFinished();
        setMultiplayerFinished(true);
      }
    }, 1000);
  };

  const handleHostForceSettle = () => {
    if (!p2pManager.isHost) return;
    clearSettlementTimer();
    p2pManager.sendAllFinished();
    setMultiplayerFinished(true);
  };

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
        setMyFinishedInMultiplayer(false);
        setMultiplayerFinished(false);
        setSettlementCountdown(30);
        clearSettlementTimer();
        setGameStatus('playing');
        setBattleEvents([]);
      },
      onProgressUpdate: (playerId, update) => {
        setMultiplayerPlayers((prev) => {
          const next = prev.map((p) => (p.id === playerId ? { ...p, ...update } : p));
          // 若為房主，檢查是否全員完賽或需要啟動 30 秒結算超時倒數
          if (p2pManager.isHost) {
            const allDone = next.length > 0 && next.every((p) => p.isFinished);
            if (allDone) {
              clearSettlementTimer();
              p2pManager.sendAllFinished();
              setMultiplayerFinished(true);
            } else if (next.some((p) => p.isFinished)) {
              startSettlementCountdown();
            }
          }
          return next;
        });
      },
      onBattleEvent: (text, type) => {
        const newEvent = { id: `${Date.now()}-${Math.random()}`, text, type };
        setBattleEvents((prev) => [...prev.slice(-3), newEvent]);
      },
      onSettlementCountdown: (secondsLeft) => {
        setSettlementCountdown(secondsLeft);
      },
      onAllFinished: () => {
        clearSettlementTimer();
        setMultiplayerFinished(true);
      },
      onReturnToLobby: () => {
        clearSettlementTimer();
        setMyFinishedInMultiplayer(false);
        setMultiplayerFinished(false);
        setSettlementCountdown(30);
        setGameStatus('idle');
        setActiveQuestions([]);
        setCurrentQuestionIndex(0);
      },
      onLobbySessionReset: () => {
        clearSettlementTimer();
        setMyFinishedInMultiplayer(false);
        setMultiplayerFinished(false);
        setSettlementCountdown(30);
        setGameStatus('idle');
        setActiveQuestions([]);
        setCurrentQuestionIndex(0);
        setNoticeMessage('對局已結束，請重新輸入 6 位房號加入下一場！');
        setTimeout(() => setNoticeMessage(null), 5000);
      },
      onDisconnected: (reason) => {
        clearSettlementTimer();
        // 房主離線容錯保護：若客端仍在戰鬥中，無縫切換至單機模式讓玩家打完，結算個人成績
        if (gameStatus === 'playing') {
          setIsOfflineFallback(true);
          setNoticeMessage('房主已離線，已為您無縫切換至本地挑戰模式，完成後將為您呈現個人成績！');
          setTimeout(() => setNoticeMessage(null), 5000);
          return;
        }
        setMyFinishedInMultiplayer(false);
        setNoticeMessage(reason || '與房間連線已中斷');
        setMultiplayerFinished(false);
        setSettlementCountdown(30);
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
    roundReviews?: RoundReviewItem[];
  }) => {
    setLatestStats(stats);
    // 若為房主離線容錯模式，無縫轉入單人結算
    if (isOfflineFallback) {
      setIsOfflineFallback(false);
      setGameMode('solo');
      setGameStatus('completed');
      p2pManager.destroy();
      return;
    }

    if (gameMode === 'multiplayer') {
      const me = multiplayerPlayers.find((p) => p.id === p2pManager.myPlayerId);
      const myName = me?.name || '我方戰士';
      p2pManager.sendBattleEvent(`🏆 ${myName} 已完成全部目標！`, 'finish');
      setMyFinishedInMultiplayer(true);

      if (p2pManager.isHost) {
        const next = multiplayerPlayers.map((p) =>
          p.id === p2pManager.myPlayerId
            ? { ...p, isFinished: true, finishTime: Math.round(stats.timeElapsedSeconds * 10) / 10 }
            : p
        );
        const allDone = next.length > 0 && next.every((p) => p.isFinished);
        if (allDone) {
          clearSettlementTimer();
          p2pManager.sendAllFinished();
          setMultiplayerFinished(true);
        } else {
          // 依房主作答時間為基準自動延長寬限時間：公式 Math.min(90, Math.max(30, Math.round(stats.timeElapsedSeconds * 0.5)))
          const hostGrace = Math.min(90, Math.max(30, Math.round(stats.timeElapsedSeconds * 0.5)));
          startSettlementCountdown(hostGrace);
        }
      }
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
    clearSettlementTimer();
    setMyFinishedInMultiplayer(false);
    setMultiplayerFinished(false);
    setSettlementCountdown(30);
    setGameStatus('idle');
    setActiveQuestions([]);
    setCurrentQuestionIndex(0);
    setLatestStats(null);
  };

  // 重新再來一局 (單人)
  const handlePlayAgainSolo = () => {
    handleStartSoloGame();
  };

  // 多人重返大廳：房主清除訪客連線並重置房間；訪客斷開並需重輸房號
  const handleReturnToMultiplayerLobby = () => {
    clearSettlementTimer();
    setMyFinishedInMultiplayer(false);
    setMultiplayerFinished(false);
    setSettlementCountdown(30);
    setActiveQuestions([]);
    setCurrentQuestionIndex(0);
    setGameStatus('idle');

    if (p2pManager.isHost) {
      p2pManager.returnToLobby();
    } else {
      p2pManager.destroy();
      setNoticeMessage('已返回大廳，請重新輸入 6 位房號以加入下一場！');
      setTimeout(() => setNoticeMessage(null), 4000);
    }
  };

  // 退出多人模式回到單人
  const handleQuitMultiplayer = () => {
    clearSettlementTimer();
    setMyFinishedInMultiplayer(false);
    setMultiplayerFinished(false);
    setSettlementCountdown(30);
    p2pManager.destroy();
    setGameMode('solo');
    setGameStatus('idle');
  };

  return (
    <div className={`w-full bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden ${
      gameStatus === 'playing' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-[100dvh] h-auto overflow-y-auto'
    }`}>
      {/* Global Navigation Header - 戰鬥中在矮螢幕 (垂直高度低於 850px)、筆電或手機端自動收合，釋出全高給戰機與輸入框；高解析高垂直螢幕或非戰鬥時完整保留 */}
      <div className={gameStatus === 'playing' ? 'hidden [@media(min-width:1280px)_and_(min-height:850px)]:block shrink-0' : 'w-full shrink-0 sticky top-0 z-40'}>
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
      </div>

      {/* Main Game Stage - 戰鬥時鎖定並居中戰場；選單與大廳時頂部對齊並支援平滑向下捲動，絕不截斷按鈕 */}
      <main className={`flex-1 flex flex-col items-center w-full relative min-h-0 ${
        gameStatus === 'playing' ? 'justify-center p-1 sm:p-2.5 overflow-hidden' : 'justify-start p-2 sm:p-4 md:py-6 overflow-y-visible'
      }`}>
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
          <React.Suspense fallback={<div className="min-h-[400px] flex items-center justify-center text-stone-500 font-mono text-sm">載入多人連線大廳...</div>}>
            <MultiplayerLobby
              p2pManager={p2pManager}
              onStartBattle={handleStartMultiplayerBattle}
              onExitMultiplayer={handleQuitMultiplayer}
              soundOn={soundOn}
              questionBank={questionBank}
            />
          </React.Suspense>
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
            settlementCountdown={
              gameMode === 'multiplayer' && multiplayerPlayers.some((p) => p.isFinished)
                ? settlementCountdown
                : null
            }
          />
        )}

        {/* === 4. 單人結算畫面 === */}
        {gameMode === 'solo' && gameStatus === 'completed' && latestStats && (
          <React.Suspense fallback={null}>
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
          </React.Suspense>
        )}

        {/* === 5. 多人連線戰情監控等待面板 (完成後等待全員結算) === */}
        {gameMode === 'multiplayer' && myFinishedInMultiplayer && !multiplayerFinished && (
          <React.Suspense fallback={null}>
            <MultiplayerWaitingRoom
              players={multiplayerPlayers}
              myPlayerId={p2pManager.myPlayerId}
              isHost={p2pManager.isHost}
              settings={roomSettings}
              secondsLeft={settlementCountdown}
              onForceSettle={handleHostForceSettle}
              onQuit={handleQuitMultiplayer}
            />
          </React.Suspense>
        )}

        {/* === 6. 多人連線賽後頒獎台 (全員完成/超時/房主強制結算後同步揭曉) === */}
        {gameMode === 'multiplayer' && multiplayerFinished && (
          <React.Suspense fallback={null}>
            <MultiplayerResultModal
              players={multiplayerPlayers}
              myPlayerId={p2pManager.myPlayerId}
              isHost={p2pManager.isHost}
              settings={roomSettings}
              onReturnToLobby={handleReturnToMultiplayerLobby}
              onQuitMultiplayer={handleQuitMultiplayer}
            />
          </React.Suspense>
        )}
      </main>

      {/* Footer - 挑戰時隱藏，避免佔據平板與手機可視空間 */}
      {gameStatus !== 'playing' && (
        <footer className="w-full border-t border-stone-900 py-3 text-center text-xs text-stone-500">
        </footer>
      )}

      {/* Modals - 延遲按需加載 */}
      <React.Suspense fallback={null}>
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
      </React.Suspense>

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
