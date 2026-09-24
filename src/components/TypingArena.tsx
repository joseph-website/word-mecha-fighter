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
  LogOut,
  CheckCircle2
} from 'lucide-react';
import { QuestionItem, ReviewCharRecord } from '../types';
import {
  playLaserShotSound,
  playExplosionSound,
  playPerfectClearSound,
  playKeyStrokeSound,
  playCorrectSound,
  playErrorSound,
  playQuestionCompleteSound,
  playCountdownBeep,
  playPenaltySound,
  playComboSurgeSound
} from '../utils/audio';
import { getSentenceZhuyin } from '../utils/zhuyin';

interface TypingArenaProps {
  questions: QuestionItem[];
  questionIndex: number;
  onNextQuestion: () => void;
  onSkipQuestion?: () => void;
  onFinishChallenge: (stats: {
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
    reviewItems?: ReviewCharRecord[];
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
  isPerfect?: boolean;
}

interface ExplosionEffect {
  id: number;
  x: number;
  y: number;
  text: string;
}

// 戰鬥空域縱向超音速光流線配置 (貫穿高空的戰鬥速度感)
const SPEED_LINES = [
  { id: 1, left: '6%', height: '55%', delay: '0s', duration: '1.2s', opacity: 0.18 },
  { id: 2, left: '14%', height: '75%', delay: '0.4s', duration: '0.9s', opacity: 0.28 },
  { id: 3, left: '23%', height: '45%', delay: '0.8s', duration: '1.4s', opacity: 0.15 },
  { id: 4, left: '32%', height: '80%', delay: '0.2s', duration: '1.1s', opacity: 0.22 },
  { id: 5, left: '42%', height: '60%', delay: '0.6s', duration: '1.3s', opacity: 0.16 },
  { id: 6, left: '58%', height: '65%', delay: '0.1s', duration: '1.0s', opacity: 0.2 },
  { id: 7, left: '68%', height: '85%', delay: '0.5s', duration: '0.95s', opacity: 0.26 },
  { id: 8, left: '77%', height: '50%', delay: '0.9s', duration: '1.5s', opacity: 0.14 },
  { id: 9, left: '86%', height: '70%', delay: '0.3s', duration: '1.05s', opacity: 0.24 },
  { id: 10, left: '94%', height: '60%', delay: '0.7s', duration: '1.25s', opacity: 0.18 },
];

// 戰鬥空域縱深微光粒子配置 (極低透明度 4%~8%，緩慢漂移營造高空大氣層次)
const AMBIENT_MOTES = [
  { id: 1, top: '12%', left: '8%', size: 2, delay: 0, duration: 8 },
  { id: 2, top: '26%', left: '22%', size: 2.5, delay: 1.5, duration: 9 },
  { id: 3, top: '18%', left: '78%', size: 2, delay: 2, duration: 7 },
  { id: 4, top: '48%', left: '14%', size: 2, delay: 0.5, duration: 10 },
  { id: 5, top: '65%', left: '84%', size: 2.5, delay: 2.5, duration: 8.5 },
  { id: 6, top: '78%', left: '28%', size: 2, delay: 1, duration: 9.5 },
  { id: 7, top: '35%', left: '92%', size: 2, delay: 3, duration: 11 },
  { id: 8, top: '82%', left: '72%', size: 2, delay: 1.8, duration: 7.5 },
  { id: 9, top: '14%', left: '45%', size: 1.5, delay: 2.2, duration: 8 },
  { id: 10, top: '56%', left: '6%', size: 2, delay: 0.8, duration: 9 },
  { id: 11, top: '72%', left: '50%', size: 2, delay: 1.2, duration: 10 },
  { id: 12, top: '22%', left: '62%', size: 1.5, delay: 2.8, duration: 8.2 },
];

export interface CharEvaluation {
  char: string;
  status: 'correct' | 'wrong' | 'unanswered';
  userChar?: string;
}

export interface SubmissionEvaluation {
  evaluatedChars: CharEvaluation[];
  isAllCorrect: boolean;
  isPassed: boolean;
  damagePercent: number;
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
  onSkipQuestion,
  onFinishChallenge,
  onQuit,
  isMultiplayer,
  onProgressTick,
  multiplayerHeader,
}) => {
  const questionsRef = useRef(questions);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

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

  // 物理打擊反饋 (打字或選字落位時，靶機產生極微幅 1-2px 物理震顫回饋)
  const [targetJolt, setTargetJolt] = useState<boolean>(false);
  const triggerTargetJolt = () => {
    setTargetJolt(true);
    setTimeout(() => setTargetJolt(false), 90);
  };

  // 累計數據
  const [accumulatedCorrect, setAccumulatedCorrect] = useState<number>(0);
  const [accumulatedTargetChars, setAccumulatedTargetChars] = useState<number>(0);
  const [accumulatedErrors, setAccumulatedErrors] = useState<number>(0);
  const [accumulatedMissing, setAccumulatedMissing] = useState<number>(0);
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
    // 立即自動聚焦輸入框，使玩家在倒數期間即可直接敲打鍵盤測試輸入法與手感
    inputRef.current?.focus();

    // 進入時立即播放第 1 聲倒數短音，確保與數字 5 呈現無時差同步
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

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 動畫與擊破視覺特效 (區分 100% 完美全對 vs 70%~99% 一般重創)
  const [laserBeams, setLaserBeams] = useState<LaserBeam[]>([]);
  const [explosions, setExplosions] = useState<ExplosionEffect[]>([]);
  const [isBlasting, setIsBlasting] = useState<boolean>(false);
  const [blastType, setBlastType] = useState<'perfect' | 'normal' | null>(null);
  const [blastDamage, setBlastDamage] = useState<number>(100);
  const [cannonRecoil, setCannonRecoil] = useState<boolean>(false);
  const [showQuitModal, setShowQuitModal] = useState<boolean>(false);

  // DOM 參照
  const inputRef = useRef<HTMLInputElement>(null);
  const skyContainerRef = useRef<HTMLDivElement>(null);
  const targetElementRef = useRef<HTMLDivElement>(null);
  const turretElementRef = useRef<HTMLDivElement>(null);

  // 跳過題目懲罰狀態 (停留 3 秒並展示標準注音)
  const [isPenaltyActive, setIsPenaltyActive] = useState<boolean>(false);
  const [penaltySecondsLeft, setPenaltySecondsLeft] = useState<number>(3);
  const penaltyTimerRef = useRef<number | null>(null);

  const clearPenaltyTimer = () => {
    if (penaltyTimerRef.current) {
      clearInterval(penaltyTimerRef.current);
      penaltyTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPenaltyTimer();
    };
  }, []);

  // 當題目切換時重設狀態
  useEffect(() => {
    clearPenaltyTimer();
    setIsPenaltyActive(false);
    setPenaltySecondsLeft(3);
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

  // 判斷當前題目是否為官方預設題庫（以 q- 開頭）
  const isDefaultQuestion = Boolean(
    currentQuestion?.id && currentQuestion.id.startsWith('q-')
  );

  // 當前題目注音拆解：僅官方預設題庫顯示注音，玩家自訂題庫完全不處理注音
  const zhuyinTokens = useMemo(() => {
    if (!isDefaultQuestion) return [];
    return getSentenceZhuyin(targetText, currentQuestion?.bopomofo);
  }, [isDefaultQuestion, targetText, currentQuestion?.bopomofo]);

  // 觸發跳過題目懲罰：顯示注音（若為預設題庫）並凍結停留 3 秒，並靜默於隊尾補題
  const handleTriggerSkip = () => {
    if (isPenaltyActive || countdown !== null || isBlasting) return;

    // 觸發隊尾補題：從未抽取題庫中補充一道同難度（或跨難度）題目到隊尾
    onSkipQuestion?.();

    const currentTargetLen = targetText.trim().length || 1;

    // 清空輸入
    setTypedInput('');
    setComposingBuffer('');
    setIsComposing(false);
    setLastEvaluation(null);

    // 中斷連擊、將本題目標字數全數計入全局目標字數與失誤字數
    setCurrentCombo(0);
    setAccumulatedTargetChars((prev) => prev + currentTargetLen);
    setAccumulatedErrors((prev) => prev + currentTargetLen);

    // 播放跳過懲罰警示音
    playPenaltySound();

    // 啟動 3 秒凍結學習期
    setIsPenaltyActive(true);
    setPenaltySecondsLeft(3);

    let remaining = 3;
    clearPenaltyTimer();

    penaltyTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setPenaltySecondsLeft(remaining);
      } else {
        clearPenaltyTimer();
        setIsPenaltyActive(false);

        const currentTotal = questionsRef.current.length;

        // 若已是最後一題且無可替補之新題，則結算遊戲；否則前往下一題（包含剛補入的題目）
        if (questionIndex + 1 >= currentTotal) {
          const finalTimeSec = Math.max((Date.now() - (startTime || Date.now())) / 1000, 1);
          const totalTarget = accumulatedTargetChars + currentTargetLen;
          const grossCPM = Math.round(accumulatedCorrect / (finalTimeSec / 60));
          const finalAcc =
            totalTarget > 0
              ? Math.round((accumulatedCorrect / totalTarget) * 1000) / 10
              : 0;
          const finalErrorRate = Math.max(0, Math.round((100 - finalAcc) * 10) / 10);
          const netCPM = Math.round(grossCPM * (finalAcc / 100));
          const finalWPM = Math.round(netCPM / 2);
          const totalErrors = accumulatedErrors + currentTargetLen;

          if (isMultiplayer && onProgressTick) {
            onProgressTick({
              questionIndex: questionIndex + 1,
              currentProgress: 100,
              overallPercent: 100,
              cpm: netCPM,
              wpm: finalWPM,
              accuracy: finalAcc,
              combo: 0,
              isFinished: true,
              finishTime: Math.round(finalTimeSec * 10) / 10,
            });
          }

          setTimeout(() => {
            onFinishChallenge({
              totalChars: totalTarget,
              correctChars: accumulatedCorrect,
              errorChars: totalErrors,
              timeElapsedSeconds: finalTimeSec,
              cpm: netCPM,
              wpm: finalWPM,
              accuracy: finalAcc,
              maxCombo: maxCombo,
              errorRate: finalErrorRate,
              netCpm: netCPM,
            });
          }, 300);
        } else {
          if (onProgressTick) {
            const nextIdx = questionIndex + 1;
            const nextOverall = (nextIdx / currentTotal) * 100;
            const totalTarget = accumulatedTargetChars + currentTargetLen;
            const curGrossCPM = Math.round(accumulatedCorrect / Math.max((Date.now() - (startTime || Date.now())) / 60000, 0.05));
            const curAcc =
              totalTarget > 0
                ? Math.round((accumulatedCorrect / totalTarget) * 1000) / 10
                : 100;
            const curNetCPM = Math.round(curGrossCPM * (curAcc / 100));
            onProgressTick({
              questionIndex: nextIdx,
              currentProgress: 0,
              overallPercent: Math.min(100, nextOverall),
              cpm: curNetCPM,
              wpm: Math.round(curNetCPM / 2),
              accuracy: curAcc,
              combo: 0,
              isFinished: false,
            });
          }
          onNextQuestion();
        }
      }
    }, 1000);
  };

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
    if (!inputChar || !targetChar) return false;
    if (inputChar === targetChar) return true;
    const punctMap: Record<string, string[]> = {
      '，': ['，', ','],
      '。': ['。', '.'],
      '！': ['！', '!'],
      '？': ['？', '?'],
      '；': ['；', ';'],
      '：': ['：', ':'],
      '、': ['、', '\\'],
      '「': ['「', '"', "'", '“'],
      '」': ['」', '"', "'", '”'],
      '『': ['『', '"', "'", '“'],
      '』': ['』', '"', "'", '”'],
      '—': ['—', '-', '–'],
      '～': ['～', '~'],
      '（': ['（', '('],
      '）': ['）', ')'],
    };
    if (punctMap[targetChar] && punctMap[targetChar].includes(inputChar)) {
      return true;
    }
    return false;
  }

  // LCS 最長公共子序列動態對齊比對演算法 (解決漏打字/標點符號造成後半段骨牌式整句誤判)
  function evaluateInputLCS(target: string, user: string) {
    const targetChars = target.split('');
    const userChars = user.split('');
    const M = targetChars.length;
    const N = userChars.length;

    const MATCH = 2;
    const MISMATCH = -1;
    const GAP_T = -1.5;
    const GAP_U = -1.5;

    const dp = Array.from({ length: M + 1 }, () => new Float64Array(N + 1));

    for (let i = 0; i <= M; i++) dp[i][0] = i * GAP_U;
    for (let j = 0; j <= N; j++) dp[0][j] = j * GAP_T;

    for (let i = 1; i <= M; i++) {
      for (let j = 1; j <= N; j++) {
        const matchScore = isCharMatch(userChars[j - 1], targetChars[i - 1]) ? MATCH : MISMATCH;
        dp[i][j] = Math.max(
          dp[i - 1][j - 1] + matchScore,
          dp[i - 1][j] + GAP_U,
          dp[i][j - 1] + GAP_T
        );
      }
    }

    let i = M;
    let j = N;
    const alignments: { targetChar: string | null; userChar: string | null }[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        const matchScore = isCharMatch(userChars[j - 1], targetChars[i - 1]) ? MATCH : MISMATCH;
        if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + matchScore)) < 1e-6) {
          alignments.push({ targetChar: targetChars[i - 1], userChar: userChars[j - 1] });
          i--;
          j--;
          continue;
        }
      }
      if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + GAP_U)) < 1e-6) {
        alignments.push({ targetChar: targetChars[i - 1], userChar: null });
        i--;
        continue;
      }
      if (j > 0) {
        alignments.push({ targetChar: null, userChar: userChars[j - 1] });
        j--;
        continue;
      }
    }

    alignments.reverse();

    const evaluatedChars: CharEvaluation[] = [];
    let correctCount = 0;
    let wrongCount = 0;
    let missingCount = 0;
    const excessChars: string[] = [];

    for (const pair of alignments) {
      if (pair.targetChar !== null) {
        if (pair.userChar !== null) {
          if (isCharMatch(pair.userChar, pair.targetChar)) {
            evaluatedChars.push({ char: pair.targetChar, status: 'correct', userChar: pair.userChar });
            correctCount++;
          } else {
            evaluatedChars.push({ char: pair.targetChar, status: 'wrong', userChar: pair.userChar });
            wrongCount++;
          }
        } else {
          evaluatedChars.push({ char: pair.targetChar, status: 'unanswered' });
          missingCount++;
        }
      } else {
        if (pair.userChar !== null) {
          excessChars.push(pair.userChar);
        }
      }
    }

    return {
      evaluatedChars,
      correctCount,
      wrongCount,
      missingCount,
      hasExcess: excessChars.length > 0,
      excessText: excessChars.join(''),
      excessCount: excessChars.length,
    };
  }

  // 發射雷射動畫 (區分完美雙重碧綠/金光束與一般重創橙紅光束)
  const triggerLaserShot = (isPerfect: boolean = false) => {
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
        isPerfect,
      };

      setLaserBeams((prev) => [...prev, beam]);
      setTimeout(() => {
        setLaserBeams((prev) => prev.filter((b) => b.id !== beam.id));
      }, isPerfect ? 450 : 350);
    }
  };

  // 擊破空中句子 (>= 70% 傷害判定通過：強烈區分 100% 全對完美擊破 vs 70%~99% 一般重創)
  const handleDestroyTarget = (
    hitCorrectChars: number,
    questionTargetLen: number,
    questionErrors: number,
    questionMissing: number,
    damagePercent: number,
    isAllCorrect: boolean
  ) => {
    setIsBlasting(true);
    setBlastType(isAllCorrect ? 'perfect' : 'normal');
    setBlastDamage(damagePercent);

    if (isAllCorrect) {
      // 100% 完美擊破：播放專屬清脆和弦大獎音效，大噴發翡翠綠與金色紙花
      playPerfectClearSound();
      try {
        confetti({
          particleCount: 85,
          spread: 80,
          origin: { y: 0.35 },
          colors: ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#ffffff'],
        });
      } catch {
        // ignore
      }
    } else {
      // 70%~99% 一般重創：播放深沉金屬爆炸聲，噴發橙紅火花煙屑
      playExplosionSound();
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.4 },
          colors: ['#f97316', '#ea580c', '#78716c'],
        });
      } catch {
        // ignore
      }
    }

    // 增加連擊：100% 完美擊破連擊 +1；70%~99% 命中過關延續連擊
    const newCombo = isAllCorrect ? currentCombo + 1 : Math.max(1, currentCombo);
    setCurrentCombo(newCombo);
    if (newCombo > maxCombo) {
      setMaxCombo(newCombo);
    }
    // 連擊音效：達成連續擊破時播放階梯式充能音效
    if (newCombo > 1) {
      playComboSurgeSound(newCombo);
    }

    const updatedTotalCorrect = accumulatedCorrect + hitCorrectChars;
    const updatedTotalTargetChars = accumulatedTargetChars + questionTargetLen;
    const updatedTotalErrors = accumulatedErrors + questionErrors;
    const updatedTotalMissing = accumulatedMissing + questionMissing;

    setAccumulatedCorrect(updatedTotalCorrect);
    setAccumulatedTargetChars(updatedTotalTargetChars);
    setAccumulatedErrors(updatedTotalErrors);
    setAccumulatedMissing(updatedTotalMissing);

    const currentTotal = questionsRef.current.length;

    // 檢查是否所有題目皆已擊破
    if (questionIndex + 1 >= currentTotal) {
      const finalTimeSec = Math.max((Date.now() - (startTime || Date.now())) / 1000, 1);
      const grossCPM = Math.round(updatedTotalCorrect / (finalTimeSec / 60));
      
      // 方案 B：漏打字數視同未擊中，直接折抵最終準確率
      const finalAcc =
        updatedTotalTargetChars > 0
          ? Math.round((updatedTotalCorrect / updatedTotalTargetChars) * 1000) / 10
          : 100;
      const finalErrorRate = Math.max(0, Math.round((100 - finalAcc) * 10) / 10);
      const finalMissingRate =
        updatedTotalTargetChars > 0
          ? Math.round((updatedTotalMissing / updatedTotalTargetChars) * 1000) / 10
          : 0;

      // 方案 A：淨字速依準確率折抵，每漏打一字直接施予 1.5 扣罰，徹底杜絕省略標點提速
      const penaltyDeduction = Math.round(updatedTotalMissing * 1.5);
      const netCPM = Math.max(0, Math.round(grossCPM * (finalAcc / 100)) - penaltyDeduction);
      const finalWPM = Math.round(netCPM / 2);

      if (onProgressTick) {
        onProgressTick({
          questionIndex: currentTotal,
          currentProgress: 100,
          overallPercent: 100,
          cpm: netCPM,
          wpm: finalWPM,
          accuracy: finalAcc,
          combo: Math.max(newCombo, maxCombo),
          isFinished: true,
          finishTime: Math.round(finalTimeSec * 10) / 10,
        });
      }

      setTimeout(() => {
        setIsBlasting(false);
        setBlastType(null);
        onFinishChallenge({
          totalChars: updatedTotalTargetChars,
          correctChars: updatedTotalCorrect,
          errorChars: updatedTotalErrors,
          timeElapsedSeconds: finalTimeSec,
          cpm: netCPM,
          wpm: finalWPM,
          accuracy: finalAcc,
          maxCombo: Math.max(newCombo, maxCombo),
          errorRate: finalErrorRate,
          netCpm: netCPM,
          missingChars: updatedTotalMissing,
          missingRate: finalMissingRate,
        });
      }, isAllCorrect ? 750 : 550);
    } else {
      if (onProgressTick) {
        const nextIdx = questionIndex + 1;
        const nextOverall = (nextIdx / currentTotal) * 100;
        const curGrossCPM = Math.round(updatedTotalCorrect / Math.max((Date.now() - (startTime || Date.now())) / 60000, 0.05));
        const curAcc =
          updatedTotalTargetChars > 0
            ? Math.round((updatedTotalCorrect / updatedTotalTargetChars) * 1000) / 10
            : 100;
        const curPenalty = Math.round(updatedTotalMissing * 1.5);
        const curNetCPM = Math.max(0, Math.round(curGrossCPM * (curAcc / 100)) - curPenalty);
        onProgressTick({
          questionIndex: nextIdx,
          currentProgress: 0,
          overallPercent: Math.min(100, nextOverall),
          cpm: curNetCPM,
          wpm: Math.round(curNetCPM / 2),
          accuracy: curAcc,
          combo: newCombo,
          isFinished: false,
        });
      }
      setTimeout(() => {
        onNextQuestion();
        setIsBlasting(false);
        setBlastType(null);
      }, isAllCorrect ? 550 : 450);
    }
  };

  // 檢查目前輸入是否擊破（按 Enter 或點擊「發射擊破」才觸發）
  const checkSubmission = (currentText: string) => {
    if (isPenaltyActive || countdown !== null) {
      return;
    }

    if (!startTime && currentText.length > 0) {
      setStartTime(Date.now());
    }

    const trimmed = currentText.trim();
    const targetTrimmed = targetText.trim();

    if (!trimmed) {
      return;
    }

    // 使用 LCS 智慧動態對齊比對：徹底避免漏打一個標點符號造成後續字串全數骨牌式錯位
    const {
      evaluatedChars: evaluated,
      correctCount,
      wrongCount,
      missingCount,
      hasExcess,
      excessText,
      excessCount,
    } = evaluateInputLCS(targetTrimmed, trimmed);

    const isAllCorrect = correctCount === targetTrimmed.length && !hasExcess && missingCount === 0 && wrongCount === 0;
    const damagePercent = Math.round((correctCount / Math.max(targetTrimmed.length, 1)) * 100);
    const isPassed = damagePercent >= 70; // 達到 70% 傷害門檻即過關擊墜！
    const questionErrors = wrongCount + excessCount + missingCount;

    const evaluation: SubmissionEvaluation = {
      evaluatedChars: evaluated,
      isAllCorrect,
      isPassed,
      damagePercent,
      submittedText: trimmed,
      hasExcess,
      excessText,
      correctCount,
      wrongCount,
      missingCount,
    };

    setLastEvaluation(evaluation);

    if (isPassed) {
      // 達成 70% 傷害門檻：擊沉敵機並推進下一題
      triggerLaserShot(isAllCorrect);
      handleDestroyTarget(correctCount, targetTrimmed.length, questionErrors, missingCount, damagePercent, isAllCorrect);
      setTypedInput('');
    } else {
      // 傷害不足 70% 門檻：傷害不足，播放警告與受挫晃動
      playErrorSound();
      const penalty = Math.max(1, questionErrors);
      setAccumulatedErrors((prev) => prev + penalty);
      setCurrentCombo(0);
      setVesselShake(true);
      setTimeout(() => setVesselShake(false), 500);
      // 玩家送出後若傷害不足 70%，清空輸入視窗，玩家重新輸入
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

    // 播放鍵盤敲擊音效與機體微受擊微晃震顫
    if (!isComposing) {
      playKeyStrokeSound();
      triggerTargetJolt();
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
    playKeyStrokeSound();
    triggerTargetJolt();
    // 不自動送出，依需求必須按 Enter 或「發射擊破」才送出
  };

  // Enter 送出擊破或 Escape 處理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      // 倒數期間或跳過懲罰期間不執行發射擊破
      if (countdown !== null || isPenaltyActive) return;
      checkSubmission(typedInput);
    } else if (e.key === 'Escape') {
      if (isPenaltyActive) return;
      // 清空目前輸入與評估標註
      setTypedInput('');
      setLastEvaluation(null);
    }
  };

  // 即時打字指標計算
  const totalCorrect = accumulatedCorrect + (lastEvaluation?.isPassed ? 0 : evaluatedCharsCount);
  const totalTargetChars = accumulatedTargetChars + (lastEvaluation?.isPassed ? 0 : (targetText.trim().length || 0));
  const totalErrors = accumulatedErrors;
  const effectiveTimeMin = Math.max(elapsedSeconds / 60, 0.05);
  const grossCPM = Math.round(totalCorrect / effectiveTimeMin);
  const currentAccuracy =
    totalTargetChars > 0
      ? Math.round((totalCorrect / totalTargetChars) * 1000) / 10
      : 100;
  const currentErrorRate = Math.max(0, Math.round((100 - currentAccuracy) * 10) / 10);
  const currentCPM = Math.round(grossCPM * (currentAccuracy / 100)); // Net CPM 淨速度

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
      className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-2 sm:px-4 py-1 sm:py-2 flex flex-col gap-1.5 sm:gap-2.5 select-none justify-center transition-all"
      onClick={() => inputRef.current?.focus()}
    >
      {/* 多人連線賽況頂部導覽列 */}
      {multiplayerHeader}

      {/* Top Combat HUD (戰況儀表板) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-2 sm:p-2.5 shadow-lg space-y-1 sm:space-y-1.5">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1 sm:gap-1.5 font-bold text-amber-400 text-xs sm:text-sm">
              <Crosshair className="w-3.5 h-3.5 text-amber-500 animate-spin-slow shrink-0" />
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
              className="px-2 py-0.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 hover:text-rose-100 transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
              title="離開本次挑戰"
            >
              <LogOut className="w-3 h-3" />
              <span>離開</span>
            </button>
          </div>
        </div>

        {/* Fluid Progress Bar */}
        <div className="w-full h-1 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Combat Metrics Row - 濃縮單排高密度指標 */}
        <div className="grid grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 pt-0.5">
          {/* 1. 計時欄位 */}
          <div id="stat-timer" className="bg-stone-950/70 border border-stone-800/80 rounded-lg py-0.5 sm:py-1 px-1 sm:px-2 text-center">
            <span className="text-[9px] text-stone-400 block flex items-center justify-center gap-0.5">
              <Clock className="w-2.5 h-2.5 text-sky-400" />
              計時
            </span>
            <div className="flex items-baseline justify-center">
              <span className="text-xs sm:text-sm md:text-base font-bold font-mono text-sky-400">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* 2. 打字速度 */}
          <div id="stat-cpm" className="bg-stone-950/70 border border-stone-800/80 rounded-lg py-0.5 sm:py-1 px-1 sm:px-2 text-center">
            <span className="text-[9px] text-stone-400 block truncate">速度(CPM)</span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-xs sm:text-sm md:text-base font-bold font-mono text-amber-400">{currentCPM}</span>
              <span className="text-[8px] text-stone-500 hidden sm:inline">字/分</span>
            </div>
          </div>

          {/* 3. 已擊破目標數 (取代干擾性準確率，避免遊戲中給予挫折壓力) */}
          <div id="stat-targets-cleared" className="bg-stone-950/70 border border-stone-800/80 rounded-lg py-0.5 sm:py-1 px-1 sm:px-2 text-center">
            <span className="text-[9px] text-stone-400 block flex items-center justify-center gap-0.5 truncate">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              已擊破
            </span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-xs sm:text-sm md:text-base font-bold font-mono text-emerald-400">
                {questionIndex}
              </span>
              <span className="text-[8px] text-stone-500">
                /{questions.length}
              </span>
            </div>
          </div>

          {/* 4. 連擊 COMBO */}
          <div id="stat-combo" className="bg-stone-950/70 border border-stone-800/80 rounded-lg py-0.5 sm:py-1 px-1 sm:px-2 text-center">
            <span className="text-[9px] text-stone-400 block flex items-center justify-center gap-0.5">
              <Flame className={`w-2.5 h-2.5 ${currentCombo > 0 ? 'text-orange-500 animate-bounce' : 'text-stone-500'}`} />
              連擊
            </span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className={`text-xs sm:text-sm md:text-base font-bold font-mono ${currentCombo >= 5 ? 'text-orange-400' : 'text-stone-200'}`}>
                {currentCombo}
              </span>
              <span className="text-[8px] text-stone-500 hidden sm:inline">次</span>
            </div>
          </div>

          {/* 5. 桌面版額外顯示未擊破目標與跳過 */}
          <div id="stat-remaining" className="hidden lg:flex bg-stone-950/70 border border-stone-800/80 rounded-lg py-0.5 sm:py-1 px-2 items-center justify-between">
            <div>
              <span className="text-[9px] text-stone-400 block">未擊破目標</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-stone-200">{questions.length - questionIndex} 艘</span>
            </div>
            <button
              id="btn-skip-target-hud"
              disabled={isPenaltyActive || countdown !== null}
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerSkip();
              }}
              className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                isPenaltyActive || countdown !== null
                  ? 'text-stone-600 bg-stone-950 border-stone-900 cursor-not-allowed'
                  : 'text-stone-400 hover:text-amber-400 bg-stone-900 border-stone-800 hover:border-amber-500/50'
              }`}
              title={isPenaltyActive ? '凍結中' : '跳過當前題目（懲罰3秒）'}
            >
              <SkipForward className="w-3 h-3" />
              <span>{isPenaltyActive ? '凍結中' : '跳過'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Air Space / Sky Defense Battlefield - 自適應響應高度與縱深 */}
      <div
        id="sky-defense-battlefield"
        ref={skyContainerRef}
        className="relative w-full h-[220px] xs:h-[260px] sm:h-[300px] md:h-[350px] lg:h-[400px] xl:h-[440px] max-h-[58vh] bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 border-2 border-stone-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between p-2 sm:p-4"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.08) 0%, transparent 60%), radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 24px 24px',
        }}
      >
        {/* 背景縱向超音速速度線 (高速穿梭高空的戰鬥臨場感) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {SPEED_LINES.map((line) => (
            <div
              key={line.id}
              className="speedline-vertical"
              style={{
                left: line.left,
                height: line.height,
                animationDelay: line.delay,
                animationDuration: line.duration,
                background: `linear-gradient(to bottom, transparent, rgba(251, 191, 36, ${line.opacity}), transparent)`,
              }}
            />
          ))}
        </div>

        {/* 背景大氣縱深粒子 (極輕量緩慢微光，營造高空大氣縱深層次) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {AMBIENT_MOTES.map((mote) => (
            <motion.div
              key={mote.id}
              className="absolute rounded-full bg-amber-300/40"
              style={{
                top: mote.top,
                left: mote.left,
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                boxShadow: '0 0 6px rgba(251,191,36,0.3)',
              }}
              animate={{
                y: [0, -14, 0],
                opacity: [0.04, 0.12, 0.04],
              }}
              transition={{
                duration: mote.duration,
                delay: mote.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* 開局 5 秒畫面正中央倒數及開始提示 */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              id="game-start-countdown-overlay"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.15 }}
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
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: [0.8, 1.2, 1], opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
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
                        initial={countdown === 5 ? { scale: 1, opacity: 1 } : { scale: 1.3, opacity: 0.9 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
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

        {/* Dynamic Laser Beams SVG Layer (區分完美綠金雙光束與一般橙紅重創光束) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {laserBeams.map((beam) => (
            <React.Fragment key={beam.id}>
              {beam.isPerfect ? (
                <>
                  {/* 完美全對：外層碧綠離子護層 */}
                  <line
                    x1={beam.startX}
                    y1={beam.startY}
                    x2={beam.targetX}
                    y2={beam.targetY}
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeLinecap="round"
                    style={{
                      filter: 'drop-shadow(0 0 12px #10b981) drop-shadow(0 0 24px #34d399)',
                      opacity: 0.9,
                    }}
                  />
                  {/* 完美全對：內芯極致金光 */}
                  <line
                    x1={beam.startX}
                    y1={beam.startY}
                    x2={beam.targetX}
                    y2={beam.targetY}
                    stroke="#fbbf24"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="animate-pulse"
                    style={{
                      filter: 'drop-shadow(0 0 8px #ffffff)',
                    }}
                  />
                </>
              ) : (
                /* 一般重創：熾烈橙紅雷射光束 */
                <line
                  x1={beam.startX}
                  y1={beam.startY}
                  x2={beam.targetX}
                  y2={beam.targetY}
                  stroke="#f97316"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="animate-pulse"
                  style={{
                    filter: 'drop-shadow(0 0 8px #f97316) drop-shadow(0 0 16px #ea580c)',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </svg>

        {/* Floating Sentence Target in Air */}
        <div className="relative z-10 w-full flex flex-col items-center pt-1 sm:pt-2 min-h-[160px] sm:min-h-[175px] justify-center">
          <AnimatePresence mode="wait">
            {!isBlasting && currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                ref={targetElementRef}
                initial={{ y: -30, opacity: 0, scale: 0.95 }}
                animate={{
                  y: [0, -5, 0],
                  opacity: 1,
                  scale: targetJolt ? 0.99 : 1,
                  x: targetJolt ? 1 : 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.85,
                  transition: { duration: 0.1 },
                }}
                transition={{
                  y: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' },
                  scale: { duration: 0.08 },
                  opacity: { duration: 0.2 },
                }}
                className="w-full max-w-xl sm:max-w-2xl xl:max-w-3xl mx-auto flex flex-col items-center group cursor-pointer"
                onClick={() => inputRef.current?.focus()}
              >
                {/* Target Information Ribbon */}
                <div className="flex items-center justify-between w-full max-w-lg sm:max-w-xl xl:max-w-2xl mb-1 px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm shrink-0">
                      <Target className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                      <span>TARGET #{questionIndex + 1}</span>
                    </span>
                    {currentQuestion.meaning && (
                      <span className="text-[11px] sm:text-xs text-amber-200/90 font-sans tracking-wide">
                        {currentQuestion.meaning}
                      </span>
                    )}
                  </div>
                </div>

                {/* The Floating Sentence Vessel (飄浮詞句飛艇) */}
                <div
                  className={`relative px-4 py-2.5 sm:px-8 sm:py-3.5 rounded-xl sm:rounded-2xl bg-stone-900/90 border-2 ${
                    isPenaltyActive
                      ? 'border-amber-400 bg-stone-900/95 shadow-[0_0_35px_rgba(251,191,36,0.45)] ring-2 ring-amber-400/40'
                      : lastEvaluation?.isAllCorrect
                      ? 'border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                      : lastEvaluation && !lastEvaluation.isAllCorrect
                      ? 'border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.35)]'
                      : 'border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                  } backdrop-blur-md flex flex-col items-center justify-center transition-all duration-200 ${
                    vesselShake ? 'animate-bounce' : ''
                  }`}
                >
                  {/* Chamfered Tactical Reticle Corners */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-400" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-400" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-400" />

                  {/* 跳過懲罰狀態標頭提示 */}
                  {isPenaltyActive && (
                    <div className="w-full flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-amber-500/30">
                      <span className="text-[11px] sm:text-xs font-bold text-amber-400 flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>暫停3秒</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40 shrink-0">
                        {penaltySecondsLeft}s
                      </span>
                    </div>
                  )}

                  {/* Sentence Characters: 僅在跳過懲罰時 (isPenaltyActive) 顯示注音輔助；一般闖關不顯示注音，只呈現清晰文字與輸入後的字元對錯反饋 */}
                  {isPenaltyActive ? (
                    <div className="flex flex-wrap justify-center items-end gap-x-1.5 sm:gap-x-2.5 gap-y-1.5 py-0.5">
                      {isDefaultQuestion ? (
                        zhuyinTokens.map((item, idx) => (
                          <div key={idx} className="flex flex-col items-center justify-end">
                            {item.zhuyin ? (
                              <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 tracking-tight leading-none mb-0.5 animate-pulse drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">
                                {item.zhuyin}
                              </span>
                            ) : (
                              <span className="text-[11px] sm:text-xs leading-none mb-0.5 invisible select-none">
                                &nbsp;
                              </span>
                            )}
                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                              {item.char}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-amber-100 tracking-wider leading-snug drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                          {targetText}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 一般闖關：純文字高清晰呈現，不顯示注音；送出後以光效反饋各字元對錯 */
                    <div className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-wider leading-snug flex flex-wrap justify-center items-center gap-1 sm:gap-1.5 py-1">
                      {targetText.split('').map((char, index) => {
                        const evalItem = lastEvaluation?.evaluatedChars[index];
                        const isEvaluated = Boolean(lastEvaluation);
                        const isCorrect = evalItem?.status === 'correct';
                        const isWrong = evalItem?.status === 'wrong';
                        const isMissing = evalItem?.status === 'unanswered';

                        let charStyle = 'text-stone-100';
                        let charTitle: string | undefined = undefined;

                        if (isEvaluated) {
                          if (isCorrect) {
                            charStyle = 'text-emerald-400 font-extrabold drop-shadow-[0_0_10px_rgba(52,211,153,0.9)] bg-emerald-950/40 border-b-2 border-emerald-400 rounded-t px-0.5';
                            charTitle = '命中正確';
                          } else if (isWrong) {
                            charStyle = 'text-rose-400 font-extrabold drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] bg-rose-950/70 border-b-2 border-rose-500 rounded-t px-0.5 animate-pulse';
                            charTitle = evalItem?.userChar ? `此處輸入為「${evalItem.userChar}」` : '字元輸入錯誤';
                          } else if (isMissing) {
                            charStyle = 'text-amber-300/90 font-bold bg-amber-950/40 border-b-2 border-dashed border-amber-400/80 rounded-t px-0.5';
                            charTitle = '此字元漏打/遺漏';
                          } else {
                            charStyle = 'text-stone-500 font-normal px-0.5';
                          }
                        }

                        return (
                          <span
                            key={index}
                            className={`relative inline-block transition-all duration-150 ${charStyle}`}
                            title={charTitle}
                          >
                            {char}
                          </span>
                        );
                      })}

                      {/* 若輸入字數超出題目，在末端以紅色標註多餘字元 */}
                      {lastEvaluation?.hasExcess && (
                        <span
                          className="inline-flex items-center text-xs font-mono text-rose-300 bg-rose-950/80 border border-rose-500/60 rounded px-1.5 py-0.5 line-through decoration-rose-500 ml-1.5"
                          title="多出的字元"
                        >
                          +{lastEvaluation.excessText}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 跳過懲罰時的倒數進度條 */}
                  {isPenaltyActive && (
                    <div className="w-full mt-2">
                      <div className="w-full bg-stone-950/80 rounded-full h-1.5 overflow-hidden border border-amber-500/30">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000 ease-linear rounded-full"
                          style={{ width: `${(penaltySecondsLeft / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 送出後結果提示 (70% 通過判定) */}
                  {lastEvaluation && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] shadow-sm font-medium ${
                        lastEvaluation.isPassed
                          ? lastEvaluation.isAllCorrect
                            ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                            : 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
                          : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                      }`}
                    >
                      {lastEvaluation.isPassed ? (
                        <span>
                          {lastEvaluation.isAllCorrect
                            ? 'Perfect'
                            : 'Good'}
                        </span>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>未造成有效傷害，請重新輸入</span>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* 敵機耐久度損害條 (附 70% 臨界過載標記) */}
                  <div className="absolute -bottom-2 left-4 right-4 h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-700/80 relative">
                    {/* 70% 門檻刻度線 */}
                    <div
                      className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-amber-400/90 z-10 shadow-[0_0_4px_rgba(251,191,36,0.9)]"
                    />
                    <div
                      className={`h-full transition-all duration-300 ${
                        lastEvaluation?.isPassed
                          ? lastEvaluation.isAllCorrect
                            ? 'bg-emerald-400'
                            : 'bg-amber-400'
                          : lastEvaluation && !lastEvaluation.isPassed
                          ? 'bg-rose-500'
                          : 'bg-stone-700'
                      }`}
                      style={{
                        width: `${
                          lastEvaluation
                            ? Math.min(100, lastEvaluation.damagePercent)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explosion / Shatter Visual Flash (原地居中放大顯示 Perfect / Good，零垂直位移，絕不自下而上滑動) */}
          <AnimatePresence>
            {isBlasting && (
              <motion.div
                key="blast-fx-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center select-none z-40 pointer-events-none"
              >
                {blastType === 'perfect' ? (
                  /* === 1. 完美擊破：金色 Perfect (原地擴散放大，零垂直位移) === */
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.75 }}
                      animate={{ scale: [0.75, 1.25, 1.15] }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="font-black italic tracking-wider text-5xl sm:text-6xl md:text-7xl text-amber-400 font-mono drop-shadow-[0_0_35px_rgba(251,191,36,0.95)]"
                      style={{
                        textShadow: '0 0 25px #fbbf24, 0 0 50px #f59e0b, 0 3px 6px rgba(0,0,0,0.9)',
                      }}
                    >
                      PERFECT
                    </motion.div>
                    {currentCombo > 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.08, duration: 0.2 }}
                        className="text-amber-300 font-mono font-extrabold text-lg sm:text-2xl mt-1 tracking-widest drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]"
                      >
                        {currentCombo} COMBO!
                      </motion.div>
                    )}
                  </div>
                ) : (
                  /* === 2. 一般擊退：綠色 Good (原地擴散放大，零垂直位移) === */
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.75 }}
                      animate={{ scale: [0.75, 1.2, 1.1] }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="font-black italic tracking-wider text-5xl sm:text-6xl md:text-7xl text-emerald-400 font-mono drop-shadow-[0_0_35px_rgba(52,211,153,0.95)]"
                      style={{
                        textShadow: '0 0 25px #34d399, 0 0 50px #10b981, 0 3px 6px rgba(0,0,0,0.9)',
                      }}
                    >
                      GOOD
                    </motion.div>
                    {currentCombo > 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.08, duration: 0.2 }}
                        className="text-emerald-300 font-mono font-extrabold text-lg sm:text-2xl mt-1 tracking-widest drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                      >
                        {currentCombo} COMBO!
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next Incoming Sentence Preview (Upcoming target hovering slightly faded) */}
          {nextQuestion && !isBlasting && (
            <div className="mt-1 opacity-40 hover:opacity-75 transition-opacity text-stone-400 text-[11px] flex items-center gap-1.5">
              <span className="text-[9px] bg-stone-800 px-1 py-0.2 rounded">次發預告</span>
              <span className="truncate max-w-[260px]">{nextQuestion.text}</span>
            </div>
          )}
        </div>

        {/* Player Space Fighter / Interceptor Station at Bottom (科技感美化戰鬥機) */}
        <div
          ref={turretElementRef}
          className="relative z-10 w-full flex flex-col items-center justify-end pb-1"
        >
          {/* Fighter Craft Graphics with dynamic thrusters & laser blasters */}
          <motion.div
            animate={cannonRecoil ? { y: 6, scale: 0.94 } : { y: 0, scale: 1 }}
            transition={{ duration: 0.1 }}
            className="flex flex-col items-center select-none"
          >
            {/* Fighter Main Airframe */}
            <div className="relative flex flex-col items-center">
              {/* Twin Plasma Cannons at Wingtips / Nose (打字充能與發射光芒) */}
              <div className="flex items-center gap-5 sm:gap-7 z-20">
                <div
                  className={`w-1.5 sm:w-2 h-4 sm:h-5 rounded-t transition-all duration-200 ${
                    cannonRecoil
                      ? 'bg-amber-300 border-t border-amber-100 shadow-[0_0_16px_#f59e0b]'
                      : typedInput.length > 0
                      ? 'bg-amber-400 border-t border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                      : 'bg-stone-600 border-t border-stone-500'
                  }`}
                />
                <div
                  className={`w-1.5 sm:w-2 h-4 sm:h-5 rounded-t transition-all duration-200 ${
                    cannonRecoil
                      ? 'bg-amber-300 border-t border-amber-100 shadow-[0_0_16px_#f59e0b]'
                      : typedInput.length > 0
                      ? 'bg-amber-400 border-t border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                      : 'bg-stone-600 border-t border-stone-500'
                  }`}
                />
              </div>

              {/* Fighter Aerodynamic Nose & Wings Silhouette */}
              <div className="relative -mt-2 flex items-center justify-center">
                {/* Left Swept Wing */}
                <div
                  className="w-8 sm:w-11 h-4 sm:h-5 bg-gradient-to-bl from-stone-700 via-stone-800 to-stone-900 border-t border-l border-stone-600 rounded-tl-lg shadow-md"
                  style={{ transform: 'skewX(-28deg)' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80 m-1 shadow-[0_0_4px_#f59e0b]" />
                </div>

                {/* Central Cockpit & Reinforced Fuselage */}
                <div className="relative z-30 w-7 sm:w-9 h-7 sm:h-8 bg-gradient-to-b from-stone-600 via-stone-800 to-stone-950 border border-stone-600 rounded-t-xl flex flex-col items-center justify-between p-1 shadow-lg shadow-black/80">
                  {/* Glowing Cyan/Amber Pilot Canopy */}
                  <div
                    className={`w-3.5 sm:w-4.5 h-3 sm:h-3.5 rounded-t-lg transition-all duration-300 ${
                      cannonRecoil
                        ? 'bg-amber-300 shadow-[0_0_12px_#f59e0b]'
                        : typedInput.length > 0
                        ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]'
                        : 'bg-cyan-600/70 shadow-[0_0_6px_rgba(34,211,238,0.4)]'
                    }`}
                  />
                  {/* Integrated 3-stage Reactor Cells */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((barIdx) => {
                      const targetLen = targetText.trim().length || 1;
                      const isCharged = typedInput.trim().length >= Math.ceil((targetLen / 3) * barIdx);
                      return (
                        <span
                          key={barIdx}
                          className={`w-1.5 h-1 rounded-xs transition-all duration-150 ${
                            isCharged
                              ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                              : 'bg-stone-800'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Right Swept Wing */}
                <div
                  className="w-8 sm:w-11 h-4 sm:h-5 bg-gradient-to-br from-stone-700 via-stone-800 to-stone-900 border-t border-r border-stone-600 rounded-tr-lg shadow-md"
                  style={{ transform: 'skewX(28deg)' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80 m-1 ml-auto shadow-[0_0_4px_#f59e0b]" />
                </div>
              </div>

              {/* Ion Thrusters Afterburner Plume at Tail */}
              <div className="flex items-center gap-3 sm:gap-4 -mt-0.5">
                <div className="w-2.5 h-2 bg-cyan-400/70 rounded-b blur-xs animate-pulse" />
                <div className="w-3.5 h-2.5 bg-amber-400 rounded-b blur-xs animate-pulse" />
                <div className="w-2.5 h-2 bg-cyan-400/70 rounded-b blur-xs animate-pulse" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Primary Typing Control Bar (下方輸入欄 - 支援 16:9 螢幕舒適字級與觸控) */}
      <div className="bg-stone-900/95 border-2 border-amber-500/40 focus-within:border-amber-500 rounded-xl p-2.5 sm:p-3.5 shadow-xl space-y-1.5 sm:space-y-2">
        {/* Input Header status */}
        <div className="flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-semibold text-stone-200 flex items-center gap-1 text-xs sm:text-sm">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              防禦雷射砲輸入欄
            </span>
            {countdown !== null ? (
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                ✨ 開放暖手測試
              </span>
            ) : (
              <span className="text-[11px] text-stone-500 hidden md:inline">
                輸入完成後按 Enter 或點擊「發射擊破」
              </span>
            )}
          </div>

          {/* Composing indicator */}
          <div className="flex items-center gap-1.5">
            {isComposing && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30 animate-pulse">
                選字中: <strong>{composingBuffer}</strong>
              </span>
            )}
            <span className="text-[10px] text-stone-500 hidden xs:inline">
              [Enter] 發射 · [Esc] 清空
            </span>
          </div>
        </div>

        {/* Input Field & Fire Action */}
        <div className="relative flex items-center gap-1.5 sm:gap-2.5">
          <div className="relative flex-1">
            <input
              id="shooter-typing-input"
              ref={inputRef}
              type="text"
              value={typedInput}
              disabled={isPenaltyActive}
              onChange={handleInputChange}
              onCompositionStart={handleCompositionStart}
              onCompositionUpdate={handleCompositionUpdate}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleKeyDown}
              placeholder={
                isPenaltyActive
                  ? `⚠️ 凍結中 (${penaltySecondsLeft}s)...`
                  : countdown !== null
                  ? "趁現在找回手感"
                  : "輸入並送出句子，便可以攻擊敵人"
              }
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className={`w-full bg-stone-950 border ${
                isPenaltyActive
                  ? 'border-amber-400/60 bg-stone-900 text-amber-200'
                  : countdown !== null
                  ? 'border-amber-500/70 focus:border-amber-400 ring-1 ring-amber-500/30'
                  : 'border-stone-700 focus:border-amber-500'
              } rounded-lg px-3.5 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-base md:text-lg text-stone-100 placeholder-stone-400 focus:outline-none transition-colors shadow-inner`}
            />
            {typedInput && !isPenaltyActive && (
              <button
                id="btn-clear-input"
                onClick={() => {
                  setTypedInput('');
                  setLastEvaluation(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-300 rounded cursor-pointer"
                title="清空文字 (Esc)"
              >
                <Delete className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            id="btn-fire-laser"
            disabled={countdown !== null || isPenaltyActive}
            onClick={() => {
              if (countdown !== null || isPenaltyActive) return;
              checkSubmission(typedInput);
              inputRef.current?.focus();
            }}
            className={`px-3.5 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg ${
              countdown !== null || isPenaltyActive
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 shadow-md shadow-amber-500/20 cursor-pointer'
            } font-bold text-xs sm:text-sm md:text-base flex items-center gap-1.5 transition-all shrink-0`}
          >
            {isPenaltyActive ? (
              <span className="flex items-center gap-1 text-amber-400 font-mono">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>凍結 {penaltySecondsLeft}s</span>
              </span>
            ) : countdown !== null ? (
              <span className="flex items-center gap-1 text-stone-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>⏳ 暖手中</span>
              </span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>發射擊破</span>
              </>
            )}
          </button>
        </div>

        {/* Auxiliary Control & Information Bar */}
        <div className="flex items-center justify-between pt-0.5 gap-2 text-xs border-t border-stone-800/60">
          <div className="flex items-center gap-1.5 text-stone-400 text-[10px] sm:text-[11px]">
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              id="btn-skip-shooter-question"
              disabled={isPenaltyActive || countdown !== null}
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerSkip();
              }}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded flex items-center gap-1 transition-colors text-[10px] sm:text-[11px] cursor-pointer ${
                isPenaltyActive || countdown !== null
                  ? 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
                  : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-300'
              }`}
              title={isPenaltyActive ? '凍結中' : '跳過當前題目（懲罰3秒）'}
            >
              <SkipForward className="w-3 h-3" />
              <span>{isPenaltyActive ? '凍結中' : '跳過此題'}</span>
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
