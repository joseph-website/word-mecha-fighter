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

// 全半形標點相容檢查
export function isCharMatch(inputChar: string, targetChar: string): boolean {
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

// LCS 智慧動態對齊比對演算法 - 方案 A（順序敏感比對 / Transposition Penalty）
// 徹底避免漏打標點符號造成的整句骨牌式錯位，同時嚴格偵測並懲罰字元顛倒/倒置打錯（Transposition），強制標記為錯字不給充能
export function evaluateInputLCS(target: string, user: string) {
  const targetChars = target.split('');
  const userChars = user.split('');
  const M = targetChars.length;
  const N = userChars.length;

  const MATCH = 2;
  const MISMATCH = -1;
  const GAP_T = -2.5;
  const GAP_U = -2.5;

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
  const rawAlignments: { targetIndex: number | null; userIndex: number | null }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const matchScore = isCharMatch(userChars[j - 1], targetChars[i - 1]) ? MATCH : MISMATCH;
      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + matchScore)) < 1e-6) {
        rawAlignments.push({ targetIndex: i - 1, userIndex: j - 1 });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + GAP_U)) < 1e-6) {
      rawAlignments.push({ targetIndex: i - 1, userIndex: null });
      i--;
      continue;
    }
    if (j > 0) {
      rawAlignments.push({ targetIndex: null, userIndex: j - 1 });
      j--;
      continue;
    }
  }

  rawAlignments.reverse();

  // 步驟一：蒐集所有原始配對與孤立字元索引
  const matchedPairs: { targetIndex: number; userIndex: number }[] = [];
  const unalignedTargetIndices: number[] = [];
  const unalignedUserIndices: number[] = [];

  for (const item of rawAlignments) {
    if (item.targetIndex !== null && item.userIndex !== null) {
      if (isCharMatch(userChars[item.userIndex], targetChars[item.targetIndex])) {
        matchedPairs.push({ targetIndex: item.targetIndex, userIndex: item.userIndex });
      }
    } else if (item.targetIndex !== null) {
      unalignedTargetIndices.push(item.targetIndex);
    } else if (item.userIndex !== null) {
      unalignedUserIndices.push(item.userIndex);
    }
  }

  // 跨度比對：檢查未對齊的目標字元與未對齊的使用者輸入是否吻合（偵測跨跨度顛倒移位）
  const crossMatchedPairs: { targetIndex: number; userIndex: number }[] = [];
  const usedTarget = new Set<number>();
  const usedUser = new Set<number>();

  for (const tIdx of unalignedTargetIndices) {
    for (const uIdx of unalignedUserIndices) {
      if (!usedTarget.has(tIdx) && !usedUser.has(uIdx) && isCharMatch(userChars[uIdx], targetChars[tIdx])) {
        crossMatchedPairs.push({ targetIndex: tIdx, userIndex: uIdx });
        usedTarget.add(tIdx);
        usedUser.add(uIdx);
      }
    }
  }

  const allCandidatePairs = [...matchedPairs, ...crossMatchedPairs];

  // 步驟二：嚴格偵測倒置打（Inversion / Transposition Penalty）
  // 任何兩組候選配對若出現 (t1 - t2) * (u1 - u2) < 0，即代表輸入文字順序倒置！
  const invertedTargetIndices = new Set<number>();
  const invertedUserIndices = new Set<number>();

  for (let a = 0; a < allCandidatePairs.length; a++) {
    for (let b = a + 1; b < allCandidatePairs.length; b++) {
      const p1 = allCandidatePairs[a];
      const p2 = allCandidatePairs[b];
      if ((p1.targetIndex - p2.targetIndex) * (p1.userIndex - p2.userIndex) < 0) {
        invertedTargetIndices.add(p1.targetIndex);
        invertedTargetIndices.add(p2.targetIndex);
        invertedUserIndices.add(p1.userIndex);
        invertedUserIndices.add(p2.userIndex);
      }
    }
  }

  // 步驟三：組裝最終評估結果
  const evaluatedChars: CharEvaluation[] = [];
  let correctCount = 0;
  let wrongCount = 0;
  let missingCount = 0;
  const excessChars: string[] = [];

  for (const pair of rawAlignments) {
    if (pair.targetIndex !== null) {
      const tIdx = pair.targetIndex;
      const targetChar = targetChars[tIdx];

      if (pair.userIndex !== null) {
        const uIdx = pair.userIndex;
        const userChar = userChars[uIdx];
        const isMatch = isCharMatch(userChar, targetChar);

        // 方案 A 核心規則：若涉及順序倒置，強制標記為錯字（wrong），不得獲得命中充能
        if (isMatch && !invertedTargetIndices.has(tIdx)) {
          evaluatedChars.push({ char: targetChar, status: 'correct', userChar });
          correctCount++;
        } else {
          evaluatedChars.push({ char: targetChar, status: 'wrong', userChar });
          wrongCount++;
        }
      } else {
        // 目標字元在 raw 對齊中未配對
        if (invertedTargetIndices.has(tIdx)) {
          // 若屬於倒置字，將實際輸入字元對應為錯字
          const cross = crossMatchedPairs.find((c) => c.targetIndex === tIdx);
          const uChar = cross !== undefined ? userChars[cross.userIndex] : undefined;
          evaluatedChars.push({ char: targetChar, status: 'wrong', userChar: uChar });
          wrongCount++;
        } else {
          evaluatedChars.push({ char: targetChar, status: 'unanswered' });
          missingCount++;
        }
      }
    } else if (pair.userIndex !== null) {
      const uIdx = pair.userIndex;
      // 若該多出字元已作為倒置錯字被消耗，則不計入多餘尾隨字元
      if (!invertedUserIndices.has(uIdx)) {
        excessChars.push(userChars[uIdx]);
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
