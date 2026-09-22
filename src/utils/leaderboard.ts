import { GameRecord } from '../types';

const LEADERBOARD_STORAGE_KEY = 'chinese_typing_leaderboard_records_v1';

export function calculateGrade(cpm: number, accuracy: number): 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' {
  if (cpm >= 110 && accuracy >= 97) return 'S+';
  if (cpm >= 85 && accuracy >= 93) return 'S';
  if (cpm >= 60 && accuracy >= 88) return 'A';
  if (cpm >= 40 && accuracy >= 80) return 'B';
  if (cpm >= 20 && accuracy >= 70) return 'C';
  return 'D';
}

export function getLeaderboardRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // 過濾並排除舊有的種子/示範紀錄，確保個人成績預設純淨無殘留
        const realRecords = parsed.filter(
          (r) => r && r.id && !String(r.id).startsWith('seed-')
        );
        return realRecords;
      }
    }
  } catch (e) {
    console.error('Error reading leaderboard from localStorage', e);
  }
  return [];
}

export function saveLeaderboardRecord(record: GameRecord): GameRecord[] {
  const current = getLeaderboardRecords();
  const updated = [record, ...current]
    // 依據分數排序：主要依 CPM (字/分)，次要依準確率
    .sort((a, b) => {
      const scoreA = a.cpm * (a.accuracy / 100);
      const scoreB = b.cpm * (b.accuracy / 100);
      return scoreB - scoreA;
    })
    .slice(0, 100); // 保存前100筆
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
  return updated;
}

export function clearLeaderboardRecords(): void {
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear leaderboard in localStorage:', e);
  }
}

export function resetLeaderboardToDefault(): GameRecord[] {
  clearLeaderboardRecords();
  return [];
}

