import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  SkipForward,
  Flame,
  Delete,
  Volume2,
  VolumeX,
  Crosshair,
  Zap,
  Send,
  Sparkles,
  Target,
  AlertTriangle,
  Clock,
  LogOut
} from 'lucide-react';
import { QuestionItem } from '../types';
import {
  playLaserShotSound,
  playExplosionSound,
  playKeyStrokeSound,
  playCorrectSound,
  playErrorSound,
  playQuestionCompleteSound,
  playCountdownBeep
} from '../utils/audio';

interface TypingArenaProps {
  questions: QuestionItem[];
  questionIndex: number;
  onNextQuestion: () => void;
  onFinishChallenge: (stats: {
    totalChars: number;
    correctChars: number;
    errorChars: number;
    timeElapsedSeconds: number;
    cpm: number;
    wpm: number;
    accuracy: number;
    maxCombo: number;
  }) => void;
  onQuit: () => void;
  isMultiplayer?: boolean;
  onProgressTick?: (data: {
    questionIndex: number;
    currentProgress: number;
    overallPercent: number;
    cpm: number;
    wpm: number;
    accuracy: number;
    combo: number;
    isFinished: boolean;
    finishTime?: number;
  }) => void;
  multiplayerHeader?: React.ReactNode;
}

interface LaserBeam {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

interface ExplosionEffect {
  id: number;
  x: number;
  y: number;
  text: string;
}

export interface CharEvaluation {
  char: string;
  status: 'correct' | 'wrong' | 'unanswered';
  userChar?: string;
}

export interface SubmissionEvaluation {
  evaluatedChars: CharEvaluation[];
  isAllCorrect: boolean;
  submittedText: string;
  hasExcess: boolean;
  excessText: string;
  correctCount: number;
  wrongCount: number;
  missingCount: number;
}

export const TypingArena: React.FC<TypingArenaProps> = ({
  questions,
  questionIndex,
  onNextQuestion,
  onFinishChallenge,
  onQuit,
  isMultiplayer,
  onProgressTick,
  multiplayerHeader,
}) => {
  const currentQuestion = questions[questionIndex];
  const nextQuestion = questions[questionIndex + 1] || null;
  const targetText = currentQuestion ? currentQuestion.text : '';

  // 輸入框狀態
  const [typedInput, setTypedInput] = useState<string>('');
  const [composingBuffer, setComposingBuffer] = useState<string>('');
  const [isComposing, setIsComposing] = useState<boolean>(false);

  // 送出檢驗狀態 (送出後才針對正確顯示綠色、錯誤顯示紅色)
  const [lastEvaluation, setLastEvaluation] = useState<SubmissionEvaluation | null>(null);
  const [vesselShake, setVesselShake] = useState<boolean>(false);

  // 累計數據
  const [accumulatedCorrect, setAccumulatedCorrect] = useState<number>(0);
  const [accumulatedErrors, setAccumulatedErrors] = useState<number>(0);
  const [currentCombo, setCurrentCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);

  // 開局 5 秒中央倒數狀態: 5, 4, 3, 2, 1, 'start', null
  const [countdown, setCountdown] = useState<number | 'start' | null>(5);

  // 計時器
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  // 開局 5 秒倒數計時與提示 (不可跳過，允許玩家於倒數期間預先點選輸入框測試輸入法，倒數結束瞬間全清空)
  useEffect(() => {
    // 進入時播放第 1 聲倒數短音
    playCountdownBeep(false);

    let currentSec = 5;
    const interval = window.setInterval(() => {
      currentSec -= 1;
      if (currentSec > 0) {
        setCountdown(currentSec);
        playCountdownBeep(false);
      } else if (currentSec === 0) {
        setCountdown('start');
        playCountdownBeep(true);
        setStartTime(Date.now());
        // 倒數結束瞬間清空玩家已輸入的暖手內容，準備正式開打
        setTypedInput('');
        setComposingBuffer('');
        setIsComposing(false);
        setLastEvaluation(null);
      } else {
        clearInterval(interval);
        setCountdown(null);
        // 進入戰鬥狀態瞬間再次確保完全清空並聚焦
        setTypedInput('');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 60);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 動畫與擊破視覺特效
  const [laserBeams, setLaserBeams] = useState<LaserBeam[]>([]);
  const [explosions, setExplosions] = useState<ExplosionEffect[]>([]);
  const [isBlasting, setIsBlasting] = useState<boolean>(false);
  const [cannonRecoil, setCannonRecoil] = useState<boolean>(false);
  const [showQuitModal, setShowQuitModal] = useState<boolean>(false);

  // DOM 參照
  const inputRef = useRef<HTMLInputElement>(null);
  const skyContainerRef = useRef<HTMLDivElement>(null);
  const targetElementRef = useRef<HTMLDivElement>(null);
  const turretElementRef = useRef<HTMLDivElement>(null);

  // 當題目切換時重設狀態
  useEffect(() => {
    setTypedInput('');
    setComposingBuffer('');
    setIsComposing(false);
    setIsBlasting(false);
    setLastEvaluation(null);
    setVesselShake(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  }, [questionIndex]);

  // 計時器運作
  useEffect(() => {
    if (startTime) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((Date.now() - startTime) / 1000);
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime]);

  // 送出後的正確字數統計 (輸入中不顯示配對字數)
  const evaluatedCharsCount = lastEvaluation ? lastEvaluation.correctCount : 0;

  // 全半形標點相容檢查
  function isCharMatch(inputChar: string, targetChar: string): boolean {
    if (inputChar === targetChar) return true;
    const punctMap: Record<string, string[]> = {
      '，': ['，', ','],
      '。': ['。', '.'],
      '！': ['！', '!'],
      '？': ['？', '?'],
      '；': ['；', ';'],
      '：': ['：', ':'],
      '、': ['、', '\\'],
    };
    if (punctMap[targetChar] && punctMap[targetChar].includes(inputChar)) {
      return true;
    }
    return false;
  }

  // 檢查整句是否完全符合 (相容中英文全半形標點)
  function isSentenceMatched(input: string, target: string): boolean {
    const trimmedInput = input.trim();
    const trimmedTarget = target.trim();
    if (trimmedInput.length !== trimmedTarget.length || trimmedInput.length === 0) return false;
    for (let i = 0; i < trimmedInput.length; i++) {
      if (!isCharMatch(trimmedInput[i], trimmedTarget[i])) {
        return false;
      }
    }
    return true;
  }

  // 發射雷射動畫
  const triggerLaserShot = () => {
    playLaserShotSound();
    setCannonRecoil(true);
    setTimeout(() => setCannonRecoil(false), 120);

    if (skyContainerRef.current && targetElementRef.current && turretElementRef.current) {
      const skyRect = skyContainerRef.current.getBoundingClientRect();
      const targetRect = targetElementRef.current.getBoundingClientRect();
      const turretRect = turretElementRef.current.getBoundingClientRect();

      const beam: LaserBeam = {
        id: Date.now() + Math.random(),
        startX: turretRect.left + turretRect.width / 2 - skyRect.left,
        startY: turretRect.top - skyRect.top,
        targetX: targetRect.left + targetRect.width / 2 - skyRect.left,
        targetY: targetRect.top + targetRect.height / 2 - skyRect.top,
      };

      setLaserBeams((prev) => [...prev, beam]);
      setTimeout(() => {
        setLaserBeams((prev) => prev.filter((b) => b.id !== beam.id));
      }, 350);
    }
  };

  // 擊破空中句子
  const handleDestroyTarget = (completedChars: number) => {
    setIsBlasting(true);
    playExplosionSound();

    // 觸發爆炸紙花
    try {
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.35 },
        colors: ['#f59e0b', '#10b981', '#f97316', '#38bdf8'],
      });
    } catch {
      // ignore
    }

    // 增加連擊
    const newCombo = currentCombo + 1;
    setCurrentCombo(newCombo);
    if (newCombo > maxCombo) {
      setMaxCombo(newCombo);
    }

    const updatedTotalCorrect = accumulatedCorrect + targetText.length;
    setAccumulatedCorrect(updatedTotalCorrect);

    // 檢查是否所有題目皆已擊破
    if (questionIndex + 1 >= questions.length) {
      const finalTimeSec = Math.max((Date.now() - (startTime || Date.now())) / 1000, 1);
      const finalCPM = Math.round(updatedTotalCorrect / (finalTimeSec / 60));
      const finalWPM = Math.round(finalCPM / 2);
      const totalErrors = accumulatedErrors;
      const finalAcc =
        updatedTotalCorrect + totalErrors > 0
          ? Math.round((updatedTotalCorrect / (updatedTotalCorrect + totalErrors)) * 1000) / 10
          : 100;

      if (onProgressTick) {
        onProgressTick({
          questionIndex: questions.length,
          currentProgress: 100,
          overallPercent: 100,
          cpm: finalCPM,
          wpm: finalWPM,
          accuracy: finalAcc,
          combo: Math.max(newCombo, maxCombo),
          isFinished: true,
          finishTime: Math.round(finalTimeSec * 10) / 10,
        });
      }

      setTimeout(() => {
        onFinishChallenge({
          totalChars: updatedTotalCorrect + totalErrors,
          correctChars: updatedTotalCorrect,
          errorChars: totalErrors,
          timeElapsedSeconds: finalTimeSec,
          cpm: finalCPM,
          wpm: finalWPM,
          accuracy: finalAcc,
          maxCombo: Math.max(newCombo, maxCombo),
        });
      }, 500);
    } else {
      if (onProgressTick) {
        const nextIdx = questionIndex + 1;
        const nextOverall = (nextIdx / questions.length) * 100;
        const curCPM = Math.round(updatedTotalCorrect / Math.max((Date.now() - (startTime || Date.now())) / 60000, 0.05));
        onProgressTick({
          questionIndex: nextIdx,
          currentProgress: 0,
          overallPercent: Math.min(100, nextOverall),
          cpm: curCPM,
          wpm: Math.round(curCPM / 2),
          accuracy: 100,
          combo: newCombo,
          isFinished: false,
        });
      }
      setTimeout(() => {
        onNextQuestion();
      }, 450);
    }
  };

  // 檢查目前輸入是否擊破（按 Enter 或點擊「發射擊破」才觸發）
  const checkSubmission = (currentText: string) => {
    if (!startTime && currentText.length > 0) {
      setStartTime(Date.now());
    }

    const trimmed = currentText.trim();
    const targetTrimmed = targetText.trim();

    if (!trimmed) {
      return;
    }

    // 進行字元逐一對比：送出後才針對正確的字顯示綠色、對錯誤的字顯示紅色
    const evaluated: CharEvaluation[] = [];
    let correctCount = 0;
    let wrongCount = 0;

    for (let i = 0; i < targetTrimmed.length; i++) {
      const targetChar = targetTrimmed[i];
      if (i < trimmed.length) {
        const userChar = trimmed[i];
        const isMatch = isCharMatch(userChar, targetChar);
        if (isMatch) {
          evaluated.push({ char: targetChar, status: 'correct', userChar });
          correctCount++;
        } else {
          evaluated.push({ char: targetChar, status: 'wrong', userChar });
          wrongCount++;
        }
      } else {
        evaluated.push({ char: targetChar, status: 'unanswered' });
      }
    }

    const missingCount = Math.max(0, targetTrimmed.length - trimmed.length);
    const hasExcess = trimmed.length > targetTrimmed.length;
    const excessText = hasExcess ? trimmed.slice(targetTrimmed.length) : '';
    const isAllCorrect = correctCount === targetTrimmed.length && !hasExcess;

    const evaluation: SubmissionEvaluation = {
      evaluatedChars: evaluated,
      isAllCorrect,
      submittedText: trimmed,
      hasExcess,
      excessText,
      correctCount,
      wrongCount,
      missingCount,
    };

    setLastEvaluation(evaluation);

    if (isAllCorrect) {
      // 完全正確擊破！發射雷射與爆炸
      triggerLaserShot();
      handleDestroyTarget(targetTrimmed.length);
      setTypedInput('');
    } else {
      // 若有錯誤，計入失誤並播放錯誤音效與震動
      playErrorSound();
      const penalty = Math.max(1, wrongCount + (hasExcess ? 1 : 0) + (missingCount > 0 ? 1 : 0));
      setAccumulatedErrors((prev) => prev + penalty);
      setCurrentCombo(0);
      setVesselShake(true);
      setTimeout(() => setVesselShake(false), 500);
      // 玩家送出後若有錯字，清空輸入視窗，玩家必須從頭開始輸入
      setTypedInput('');
    }
  };

  // 處理輸入框文字變動 (純文字輸入，不即時顯示綠色，也不即時送出)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedInput(val);

    // 啟動計時器 (倒數結束後正式開打)
    if (!startTime && countdown === null && val.length > 0) {
      setStartTime(Date.now());
    }

    // 播放鍵盤敲擊音效
    if (!isComposing) {
      playKeyStrokeSound();
    }
  };

  // 處理 IME 選字
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionUpdate = (e: React.CompositionEvent<HTMLInputElement>) => {
    setComposingBuffer(e.data);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    setComposingBuffer('');
    const currentVal = e.currentTarget.value;
    setTypedInput(currentVal);
    // 不自動送出，依需求必須按 Enter 或「發射擊破」才送出
  };

  // Enter 送出擊破或 Escape 處理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      // 倒數期間不執行發射擊破
      if (countdown !== null) return;
      checkSubmission(typedInput);
    } else if (e.key === 'Escape') {
      // 清空目前輸入與評估標註
      setTypedInput('');
      setLastEvaluation(null);
    }
  };

  // 即時打字指標計算
  const totalCorrect = accumulatedCorrect + (lastEvaluation?.isAllCorrect ? 0 : evaluatedCharsCount);
  const totalErrors = accumulatedErrors;
  const effectiveTimeMin = Math.max(elapsedSeconds / 60, 0.05);
  const currentCPM = Math.round(totalCorrect / effectiveTimeMin);
  const currentAccuracy =
    totalCorrect + totalErrors > 0
      ? Math.round((totalCorrect / (totalCorrect + totalErrors)) * 1000) / 10
      : 100;

  const progressPercent = Math.round(((questionIndex) / questions.length) * 100);

  // 時間格式化 (分:秒.毫秒)
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const tenths = Math.floor((totalSecs % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  // 當打字送出評估或題目有進展時推播至多人頻道
  useEffect(() => {
    if (!onProgressTick || !isMultiplayer) return;
    const curProg = targetText.length > 0 ? (evaluatedCharsCount / targetText.length) * 100 : 0;
    const overall = ((questionIndex + (targetText.length > 0 ? evaluatedCharsCount / targetText.length : 0)) / questions.length) * 100;
    onProgressTick({
      questionIndex,
      currentProgress: Math.min(100, curProg),
      overallPercent: Math.min(100, overall),
      cpm: currentCPM,
      wpm: Math.round(currentCPM / 2),
      accuracy: currentAccuracy,
      combo: currentCombo,
      isFinished: false,
    });
  }, [evaluatedCharsCount, questionIndex, currentCPM, currentAccuracy, currentCombo, targetText.length, questions.length, onProgressTick, isMultiplayer]);

  return (
    <div
      id="typing-shooter-arena"
      className="w-full max-w-5xl mx-auto px-1.5 sm:px-4 py-1 sm:py-3 flex flex-col gap-2 sm:gap-3.5 select-none"
      onClick={() => inputRef.current?.focus()}
    >
      {/* 多人連線賽況頂部導覽列 */}
      {multiplayerHeader}

      {/* Top Combat HUD (戰況儀表板) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-xl space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1 sm:gap-1.5 font-bold text-amber-400 text-xs sm:text-sm">
              <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 animate-spin-slow shrink-0" />
              <span>進度 {questionIndex + 1} / {questions.length} 題</span>
            </span>
            <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300 font-mono">
              目標：{currentQuestion?.category || '精選文選'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-stone-400 hidden xs:flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <strong className="text-sky-300">{formatTimer(elapsedSeconds)}</strong>
            </span>
            <span className="text-amber-400 font-bold hidden sm:inline">{progressPercent}%</span>

            {/* 離開挑戰按鈕移至頂部右側，遠離下方輸入與發射區，防止手機誤觸 */}
            <button
              id="btn-quit-shooter-game-top"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuitModal(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 hover:text-rose-100 transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
              title="離開本次挑戰"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>離開</span>
            </button>
          </div>
        </div>

        {/* Fluid Progress Bar */}
        <div className="w-full h-1 sm:h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Combat Metrics Row - 手機版濃縮為單一橫排 (4 欄)，避免佔據過多高度 */}
        <div className="grid grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
          {/* 1. 計時欄位 */}
          <div id="stat-timer" className="bg-stone-950/70 border border-stone-800/80 rounded-lg sm:rounded-xl py-1 sm:py-1.5 px-1 sm:px-3 text-center">
            <span className="text-[9px] sm:text-[10px] text-stone-400 block flex items-center justify-center gap-0.5 sm:gap-1">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-400" />
              計時
            </span>
            <div className="flex items-baseline justify-center">
              <span className="text-xs sm:text-base font-bold font-mono text-sky-400">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* 2. 打字速度 */}
          <div id="stat-cpm" className="bg-stone-950/70 border border-stone-800/80 rounded-lg sm:rounded-xl py-1 sm:py-1.5 px-1 sm:px-3 text-center">
            <span className="text-[9px] sm:text-[10px] text-stone-400 block truncate">速度(CPM)</span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-xs sm:text-base font-bold font-mono text-amber-400">{currentCPM}</span>
              <span className="text-[8px] sm:text-[9px] text-stone-500 hidden sm:inline">字/分</span>
            </div>
          </div>

          {/* 3. 命中準確率 */}
          <div id="stat-accuracy" className="bg-stone-950/70 border border-stone-800/80 rounded-lg sm:rounded-xl py-1 sm:py-1.5 px-1 sm:px-3 text-center">
            <span className="text-[9px] sm:text-[10px] text-stone-400 block">準確率</span>
            <div className="flex items-baseline justify-center">
              <span
                className={`text-xs sm:text-base font-bold font-mono ${
                  currentAccuracy >= 95 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {currentAccuracy}%
              </span>
            </div>
          </div>

          {/* 4. 連擊 COMBO */}
          <div id="stat-combo" className="bg-stone-950/70 border border-stone-800/80 rounded-lg sm:rounded-xl py-1 sm:py-1.5 px-1 sm:px-3 text-center">
            <span className="text-[9px] sm:text-[10px] text-stone-400 block flex items-center justify-center gap-0.5 sm:gap-1">
              <Flame className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${currentCombo > 0 ? 'text-orange-500 animate-bounce' : 'text-stone-500'}`} />
              連擊
            </span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className={`text-xs sm:text-base font-bold font-mono ${currentCombo >= 5 ? 'text-orange-400' : 'text-stone-200'}`}>
                {currentCombo}
              </span>
              <span className="text-[8px] sm:text-[9px] text-stone-500 hidden sm:inline">次</span>
            </div>
          </div>

          {/* 5. 桌面版額外顯示未擊破目標與跳過 */}
          <div id="stat-remaining" className="hidden lg:flex bg-stone-950/70 border border-stone-800/80 rounded-xl py-1.5 px-3 items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 block">未擊破目標</span>
              <span className="text-sm font-bold font-mono text-stone-200">{questions.length - questionIndex} 艘</span>
            </div>
            <button
              id="btn-skip-target-hud"
              onClick={(e) => {
                e.stopPropagation();
                onNextQuestion();
              }}
              className="text-[11px] text-stone-400 hover:text-amber-400 flex items-center gap-1 px-2 py-1 rounded bg-stone-900 border border-stone-800 hover:border-amber-500/50 transition-colors cursor-pointer"
              title="跳過當前目標"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>跳過</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Air Space / Sky Defense Battlefield */}
      <div
        id="sky-defense-battlefield"
        ref={skyContainerRef}
        className="relative w-full h-[200px] xs:h-[225px] sm:h-[310px] md:h-[350px] bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 border-2 border-stone-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-2.5 sm:p-4"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.07) 0%, transparent 60%), radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 24px 24px',
        }}
      >
        {/* 開局 5 秒畫面正中央倒數及開始提示 */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              id="game-start-countdown-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-40 bg-stone-950/85 backdrop-blur-md flex flex-col items-center justify-center select-none"
            >
              <div className="relative flex items-center justify-center">
                {/* 科技旋轉雷達外環 */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-dashed border-amber-500/30 absolute pointer-events-none"
                />

                {/* 倒數核心圓形視窗 */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.35)] bg-stone-900/95 flex flex-col items-center justify-center p-2 text-center">
                  <AnimatePresence mode="wait">
                    {countdown === 'start' ? (
                      <motion.div
                        key="start"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: [0.6, 1.25, 1], opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="flex flex-col items-center"
                      >
                        <span className="text-2xl sm:text-3xl font-black tracking-wider text-emerald-400 drop-shadow-[0_0_16px_rgba(52,211,153,0.9)]">
                          開始！
                        </span>
                        <span className="text-[10px] font-mono text-emerald-300 font-bold tracking-widest mt-0.5">
                          FIRE!
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={countdown}
                        initial={{ scale: 1.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="flex flex-col items-center"
                      >
                        <span className="text-5xl sm:text-6xl font-black font-mono text-amber-400 drop-shadow-[0_0_25px_rgba(245,158,11,0.85)]">
                          {countdown}
                        </span>
                        <span className="text-[9px] font-mono text-amber-300/80 tracking-widest">
                          SECONDS
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 狀態提示文字 */}
              <div className="mt-4 text-center px-4">
                <div className="text-xs sm:text-sm font-medium tracking-wide">
                  {countdown === 'start' ? (
                    <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      防禦雷射砲全系統就緒！請鎖定目標輸入送出！
                    </span>
                  ) : (
                    <span className="text-stone-300">
                      防禦雷射系統充能準備中 · 戰機即將進入射程
                    </span>
                  )}
                </div>

                {countdown !== 'start' && (
                  <span className="inline-block mt-3 px-3 py-1 text-[11px] text-amber-300/90 bg-stone-900/90 border border-amber-500/30 rounded-full font-mono">
                    倒數期間可先點擊下方輸入框暖手測試輸入法
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Air Space Grid Altitude Marks */}
        <div className="absolute inset-0 pointer-events-none opacity-20 flex flex-col justify-between p-3 text-[10px] font-mono text-stone-500">
          <div className="flex justify-between border-b border-stone-800 pb-1">
            <span>[ 空域高度: 1200M - 高空飄浮區 ]</span>
            <span>RADAR ACTIVE</span>
          </div>
          <div className="border-b border-dashed border-stone-800/40 w-full" />
          <div className="flex justify-between border-t border-stone-800 pt-1">
            <span>[ 地表防禦線 - 砲台發射基座 ]</span>
            <span>READY TO FIRE</span>
          </div>
        </div>

        {/* Dynamic Laser Beams SVG Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {laserBeams.map((beam) => (
            <line
              key={beam.id}
              x1={beam.startX}
              y1={beam.startY}
              x2={beam.targetX}
              y2={beam.targetY}
              stroke="#f59e0b"
              strokeWidth="4"
              strokeLinecap="round"
              className="animate-pulse"
              style={{
                filter: 'drop-shadow(0 0 8px #f59e0b) drop-shadow(0 0 16px #fbbf24)',
              }}
            />
          ))}
        </svg>

        {/* Floating Sentence Target in Air */}
        <div className="relative z-10 w-full flex flex-col items-center pt-2 sm:pt-4">
          <AnimatePresence mode="wait">
            {!isBlasting && currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                ref={targetElementRef}
                initial={{ y: -50, opacity: 0, scale: 0.8 }}
                animate={{
                  y: [0, -6, 0],
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  scale: [1, 1.25, 0],
                  opacity: [1, 1, 0],
                  filter: ['blur(0px)', 'blur(4px)', 'blur(10px)'],
                }}
                transition={{
                  y: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' },
                  scale: { duration: 0.3 },
                  opacity: { duration: 0.3 },
                }}
                className="max-w-xl mx-auto flex flex-col items-center group cursor-pointer"
                onClick={() => inputRef.current?.focus()}
              >
                {/* Target Information Ribbon */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                    <Target className="w-3 h-3 text-amber-400 animate-pulse" />
                    <span>空中目標 #{questionIndex + 1}</span>
                  </span>
                  <span className="text-xs text-stone-400 font-sans truncate max-w-[280px]">
                    {currentQuestion.meaning}
                  </span>
                </div>

                {/* The Floating Sentence Vessel (飄浮詞句飛艇) */}
                <div
                  className={`relative px-4 py-2.5 sm:px-8 sm:py-5 rounded-xl sm:rounded-2xl bg-stone-900/90 border-2 ${
                    lastEvaluation?.isAllCorrect
                      ? 'border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                      : lastEvaluation && !lastEvaluation.isAllCorrect
                      ? 'border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.35)]'
                      : 'border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                  } backdrop-blur-md flex flex-col items-center justify-center transition-all duration-200 ${
                    vesselShake ? 'animate-bounce' : ''
                  }`}
                >
                  {/* Lock-on Reticle Corners */}
                  <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 border-t-2 border-l-2 border-amber-400" />
                  <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 border-t-2 border-r-2 border-amber-400" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 border-b-2 border-l-2 border-amber-400" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 border-b-2 border-r-2 border-amber-400" />

                  {/* Sentence Characters: 輸入中不顯示綠色對應，送出後才對正確字顯綠、錯誤字顯紅 */}
                  <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-bold tracking-wider leading-relaxed flex flex-wrap justify-center items-center gap-1 sm:gap-1.5">
                    {targetText.split('').map((char, index) => {
                      const evalItem = lastEvaluation?.evaluatedChars[index];
                      const isEvaluated = Boolean(lastEvaluation);
                      const isCorrect = evalItem?.status === 'correct';
                      const isWrong = evalItem?.status === 'wrong';

                      let charStyle = 'text-stone-100';
                      if (isEvaluated) {
                        if (isCorrect) {
                          charStyle = 'text-emerald-400 font-extrabold drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] bg-emerald-950/40 border-b-2 border-emerald-400 rounded-t px-1';
                        } else if (isWrong) {
                          charStyle = 'text-rose-400 font-extrabold drop-shadow-[0_0_12px_rgba(244,63,94,0.9)] bg-rose-950/70 border-b-2 border-rose-500 rounded-t px-1 animate-pulse';
                        } else {
                          charStyle = 'text-stone-500 font-normal px-0.5';
                        }
                      }

                      return (
                        <span
                          key={index}
                          className={`relative inline-block transition-all duration-150 ${charStyle}`}
                        >
                          {char}
                        </span>
                      );
                    })}

                    {/* 若輸入字數超出題目，在末端以紅色標註多餘字元 */}
                    {lastEvaluation?.hasExcess && (
                      <span
                        className="inline-flex items-center text-xs sm:text-sm font-mono text-rose-300 bg-rose-950/80 border border-rose-500/60 rounded px-1.5 py-0.5 line-through decoration-rose-500 ml-1"
                        title="多出的字元"
                      >
                        +{lastEvaluation.excessText}
                      </span>
                    )}
                  </div>

                  {/* 送出後若有錯誤，顯示檢驗結果提示 */}
                  {lastEvaluation && !lastEvaluation.isAllCorrect && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs shadow-sm"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>
                        {lastEvaluation.wrongCount > 0 && `${lastEvaluation.wrongCount} 字錯誤 `}
                        {lastEvaluation.missingCount > 0 && `${lastEvaluation.missingCount} 字未填 `}
                        {lastEvaluation.hasExcess && '字數超出 '}
                        — 請修正後按 Enter 或「發射擊破」
                      </span>
                    </motion.div>
                  )}

                  {/* Sub-Health Bar / Match Ratio (送出後反應正確率) */}
                  <div className="absolute -bottom-2 left-4 right-4 h-1 bg-stone-950 rounded-full overflow-hidden border border-stone-700">
                    <div
                      className={`h-full transition-all duration-300 ${
                        lastEvaluation?.isAllCorrect
                          ? 'bg-emerald-400'
                          : lastEvaluation && !lastEvaluation.isAllCorrect
                          ? 'bg-rose-500'
                          : 'bg-stone-700'
                      }`}
                      style={{
                        width: `${
                          lastEvaluation
                            ? (lastEvaluation.correctCount / (targetText.length || 1)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explosion / Shatter Visual Flash */}
          {isBlasting && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="py-12 flex flex-col items-center justify-center text-amber-400 font-bold text-2xl sm:text-3xl"
            >
              <div className="flex items-center gap-2 drop-shadow-[0_0_15px_#f59e0b]">
                <Sparkles className="w-8 h-8 text-amber-300" />
                <span>擊破成功！+100 PTS</span>
              </div>
            </motion.div>
          )}

          {/* Next Incoming Sentence Preview (Upcoming target hovering slightly faded) */}
          {nextQuestion && !isBlasting && (
            <div className="mt-3 opacity-40 hover:opacity-75 transition-opacity text-stone-400 text-xs flex items-center gap-1.5">
              <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded">次發預告</span>
              <span>{nextQuestion.text}</span>
            </div>
          )}
        </div>

        {/* Defense Cannon / Turret Station at Bottom */}
        <div
          ref={turretElementRef}
          className="relative z-10 w-full flex flex-col items-center justify-end pb-1"
        >
          {/* Laser Cannon Turret Graphics */}
          <motion.div
            animate={cannonRecoil ? { y: 6, scale: 0.95 } : { y: 0, scale: 1 }}
            transition={{ duration: 0.1 }}
            className="flex flex-col items-center"
          >
            {/* Cannon Twin Barrels */}
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-6 rounded-t-sm border border-stone-700 ${cannonRecoil ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]' : 'bg-stone-700'}`} />
              <div className={`w-2.5 h-6 rounded-t-sm border border-stone-700 ${cannonRecoil ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]' : 'bg-stone-700'}`} />
            </div>
            {/* Turret Base Mount */}
            <div className="w-16 h-5 bg-gradient-to-b from-stone-700 to-stone-900 rounded-t-xl border border-stone-600 flex items-center justify-center shadow-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Primary Typing Control Bar (下方輸入欄 - 支援實體鍵盤與觸控) */}
      <div className="bg-stone-900/95 border-2 border-amber-500/40 focus-within:border-amber-500 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xl space-y-2 sm:space-y-3">
        {/* Input Header status */}
        <div className="flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-200 flex items-center gap-1.5 text-xs sm:text-sm">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400" />
              防禦雷射砲輸入欄
            </span>
            <span className="text-[11px] text-stone-500 hidden sm:inline">
              輸入完成後按 Enter 或點擊「發射擊破」送出檢驗
            </span>
          </div>

          {/* Composing indicator */}
          <div className="flex items-center gap-2">
            {isComposing && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] border border-amber-500/30 animate-pulse">
                注音/拼音選字中: <strong>{composingBuffer}</strong>
              </span>
            )}
            <span className="text-[11px] text-stone-500 hidden xs:inline">
              [Enter] 發射 · [Esc] 清空
            </span>
          </div>
        </div>

        {/* Input Field & Fire Action */}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              id="shooter-typing-input"
              ref={inputRef}
              type="text"
              value={typedInput}
              disabled={false}
              onChange={handleInputChange}
              onCompositionStart={handleCompositionStart}
              onCompositionUpdate={handleCompositionUpdate}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleKeyDown}
              placeholder={
                countdown !== null
                  ? "倒數準備中，可先點此測試輸入法..."
                  : "在此輸入空中飄浮的句子，完成後按 Enter 或「發射擊破」..."
              }
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className={`w-full bg-stone-950 border ${
                countdown !== null
                  ? 'border-amber-500/50 focus:border-amber-400'
                  : 'border-stone-700 focus:border-amber-500'
              } rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-stone-100 placeholder-stone-400 focus:outline-none transition-colors shadow-inner`}
            />
            {typedInput && (
              <button
                id="btn-clear-input"
                onClick={() => {
                  setTypedInput('');
                  setLastEvaluation(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-300 rounded-md cursor-pointer"
                title="清空文字 (Esc)"
              >
                <Delete className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            id="btn-fire-laser"
            disabled={countdown !== null}
            onClick={() => {
              if (countdown !== null) return;
              checkSubmission(typedInput);
              inputRef.current?.focus();
            }}
            className={`px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl ${
              countdown !== null
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 shadow-lg shadow-amber-500/20 cursor-pointer'
            } font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shrink-0`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{countdown !== null ? '準備中' : '發射擊破'}</span>
          </button>
        </div>

        {/* Auxiliary Control & Information Bar - 離開按鈕已移至頂端，避免與送出按鈕緊鄰誤觸 */}
        <div className="flex items-center justify-between pt-1 gap-2 text-xs border-t border-stone-800/60">
          <div className="flex items-center gap-2 text-stone-400 text-[11px] sm:text-xs">
            <span className="hidden sm:inline">提示：支援注音、倉頡、拼音等各式輸入法，輸入完成後按 Enter 或點擊「發射擊破」送出</span>
            <span className="sm:hidden text-stone-500">完成後按 Enter 或「發射擊破」</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              id="btn-skip-shooter-question"
              onClick={(e) => {
                e.stopPropagation();
                onNextQuestion();
              }}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center gap-1 transition-colors text-[11px] sm:text-xs cursor-pointer"
              title="跳過當前題目換下一題"
            >
              <SkipForward className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>跳過此題</span>
            </button>
          </div>
        </div>
      </div>

      {/* In-App Quit Confirmation Modal */}
      {showQuitModal && (
        <div
          id="quit-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setShowQuitModal(false);
          }}
        >
          <div
            className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">確定要結束戰鬥嗎？</h3>
              <p className="text-xs text-stone-400 mt-1">目前進度將不會計入個人成績，確定要返回設定主頁嗎？</p>
            </div>
            <div className="flex gap-2">
              <button
                id="btn-cancel-quit-battle"
                onClick={() => {
                  setShowQuitModal(false);
                  inputRef.current?.focus();
                }}
                className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs sm:text-sm font-medium transition-colors"
              >
                繼續戰鬥
              </button>
              <button
                id="btn-confirm-quit-battle"
                onClick={() => {
                  setShowQuitModal(false);
                  onQuit();
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-medium transition-colors shadow-lg shadow-rose-900/30"
              >
                確定結束
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
