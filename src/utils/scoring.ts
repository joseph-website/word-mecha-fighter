export interface FinalGameStatsInput {
  totalTargetChars: number;
  totalCorrectChars: number;
  totalErrorChars: number;
  totalMissingChars?: number;
  startTime: number | null;
}

export interface FinalGameStatsOutput {
  finalTimeSec: number;
  grossCPM: number;
  accuracy: number;
  errorRate: number;
  missingRate: number;
  netCPM: number;
  wpm: number;
}

export function calculateFinalGameStats(input: FinalGameStatsInput): FinalGameStatsOutput {
  const finalTimeSec = Math.max((Date.now() - (input.startTime || Date.now())) / 1000, 1);
  const grossCPM = Math.round(input.totalCorrectChars / (finalTimeSec / 60));
  const accuracy =
    input.totalTargetChars > 0
      ? Math.round((input.totalCorrectChars / input.totalTargetChars) * 1000) / 10
      : 0;
  const errorRate = Math.max(0, Math.round((100 - accuracy) * 10) / 10);
  const totalMissing = input.totalMissingChars || 0;
  const missingRate =
    input.totalTargetChars > 0
      ? Math.round((totalMissing / input.totalTargetChars) * 1000) / 10
      : 0;
  const penaltyDeduction = Math.round(totalMissing * 1.5);
  const netCPM = Math.max(0, Math.round(grossCPM * (accuracy / 100)) - penaltyDeduction);
  const wpm = Math.round(netCPM / 2);

  return {
    finalTimeSec,
    grossCPM,
    accuracy,
    errorRate,
    missingRate,
    netCPM,
    wpm,
  };
}
