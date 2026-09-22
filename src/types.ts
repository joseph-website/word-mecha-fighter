export type Difficulty = 'easy' | 'medium' | 'hard' | 'all';
export type QuestionCount = 5 | 10 | 20;

export interface QuestionItem {
  id: string;
  text: string;
  pinyin?: string;
  bopomofo?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  meaning?: string;
}

export interface GameRecord {
  id: string;
  playerName: string;
  date: string;
  questionCount: number;
  difficulty: string;
  cpm: number; // 字符/分鐘 (Characters Per Minute)
  wpm: number; // 單詞/分鐘 (Words Per Minute ≈ cpm / 2 for Chinese)
  accuracy: number; // 準確率百分比 0-100
  totalChars: number;
  correctChars: number;
  errorChars: number;
  timeElapsedSeconds: number;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  maxCombo: number;
  errorRate?: number;
  netCpm?: number;
}

export type GameStatus = 'idle' | 'playing' | 'completed';

export type GameMode = 'solo' | 'multiplayer';

export type MultiplayerRole = 'host' | 'guest';

export interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  questionIndex: number;
  currentProgress: number; // 0-100% of current question or overall
  overallPercent: number; // 0-100% of whole match
  cpm: number;
  wpm: number;
  accuracy: number;
  combo: number;
  isFinished: boolean;
  finishTime: number | null; // 秒數
  rank?: number;
}

export interface RoomSettings {
  roomCode: string; // 6 位數密碼，例如 "489210"
  maxPlayers: number; // 2 ~ 6 人
  difficulty: Difficulty;
  questionCount: QuestionCount;
  status: 'waiting' | 'starting' | 'in_game' | 'finished';
}

export type NetworkMessage =
  | { type: 'JOIN_REQUEST'; name: string }
  | { type: 'JOIN_ACCEPTED'; playerId: string; settings: RoomSettings; players: PlayerState[] }
  | { type: 'JOIN_REJECTED'; reason: string }
  | { type: 'PLAYER_LIST_UPDATE'; players: PlayerState[]; settings: RoomSettings }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<RoomSettings> }
  | { type: 'TOGGLE_READY'; playerId: string; isReady: boolean }
  | { type: 'GAME_START'; questions: QuestionItem[]; startTime: number }
  | {
      type: 'PROGRESS_UPDATE';
      playerId: string;
      questionIndex: number;
      currentProgress: number;
      overallPercent: number;
      cpm: number;
      wpm: number;
      accuracy: number;
      combo: number;
      isFinished: boolean;
      finishTime?: number;
    }
  | { type: 'BATTLE_EVENT'; message: string; eventType: 'clear' | 'combo' | 'finish' }
  | { type: 'RETURN_TO_LOBBY' };

