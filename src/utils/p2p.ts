import { Peer, DataConnection } from 'peerjs';
import { PlayerState, RoomSettings, NetworkMessage, QuestionItem } from '../types';

export const P2P_PREFIX = 'cty-room-';

// 產生 6 位純數字隨機房間密碼 (100000 ~ 999999)
export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface P2PCallbacks {
  onPlayerListChange?: (players: PlayerState[], settings: RoomSettings) => void;
  onGameStart?: (questions: QuestionItem[], startTime: number) => void;
  onProgressUpdate?: (playerId: string, update: Partial<PlayerState>) => void;
  onBattleEvent?: (message: string, eventType: 'clear' | 'combo' | 'finish') => void;
  onError?: (errorMessage: string) => void;
  onDisconnected?: (reason: string) => void;
  onReturnToLobby?: () => void;
}

export class P2PRoomManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map(); // Host 用：記錄所有連接的客端
  private hostConnection: DataConnection | null = null; // Guest 用：與 Host 的連線
  
  public isHost: boolean = false;
  public myPlayerId: string = '';
  public myPlayerName: string = '';
  public roomCode: string = '';
  public settings: RoomSettings = {
    roomCode: '',
    maxPlayers: 4,
    difficulty: 'medium',
    questionCount: 10,
    status: 'waiting',
  };
  public players: PlayerState[] = [];
  private listeners: Set<P2PCallbacks> = new Set();

  constructor(callbacks?: P2PCallbacks) {
    if (callbacks) {
      this.listeners.add(callbacks);
    }
  }

  public addCallbacks(callbacks: P2PCallbacks): () => void {
    this.listeners.add(callbacks);
    return () => {
      this.listeners.delete(callbacks);
    };
  }

  public updateCallbacks(callbacks: P2PCallbacks) {
    this.listeners.add(callbacks);
  }

  private emit<K extends keyof P2PCallbacks>(event: K, ...args: any[]) {
    this.listeners.forEach((listener) => {
      try {
        const fn = listener[event] as any;
        if (typeof fn === 'function') {
          fn(...args);
        }
      } catch (err) {
        console.error(`P2P event listener error on ${event}:`, err);
      }
    });
  }

  // === 房主開房 (Host) ===
  public createRoom(
    hostName: string,
    initialSettings: { maxPlayers: number; difficulty: any; questionCount: any },
    specifiedCode?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.destroy();

      const code = specifiedCode || generateRoomCode();
      const hostPeerId = `${P2P_PREFIX}${code}`;
      this.isHost = true;
      this.roomCode = code;
      this.myPlayerName = hostName || '房主';
      this.myPlayerId = `host-${Date.now().toString(36)}`;

      this.settings = {
        roomCode: code,
        maxPlayers: Math.min(Math.max(initialSettings.maxPlayers, 2), 6),
        difficulty: initialSettings.difficulty,
        questionCount: initialSettings.questionCount,
        status: 'waiting',
      };

      const hostPlayer: PlayerState = {
        id: this.myPlayerId,
        name: this.myPlayerName,
        isHost: true,
        isReady: true, // 房主預設已就緒
        questionIndex: 0,
        currentProgress: 0,
        overallPercent: 0,
        cpm: 0,
        wpm: 0,
        accuracy: 100,
        combo: 0,
        isFinished: false,
        finishTime: null,
      };

      this.players = [hostPlayer];

      try {
        this.peer = new Peer(hostPeerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        this.peer.on('open', (id) => {
          this.emit('onPlayerListChange', this.players, this.settings);
          resolve(code);
        });

        this.peer.on('error', (err) => {
          if (err.type === 'unavailable-id') {
            // 代碼已被佔用，重新遞迴換一個代碼
            this.createRoom(hostName, initialSettings).then(resolve).catch(reject);
            return;
          }
          this.emit('onError', `連線錯誤: ${err.message || err.type}`);
          reject(err);
        });

        // 監聽訪客連線
        this.peer.on('connection', (conn) => {
          this.setupHostIncomingConnection(conn);
        });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  // 房主處理客端連線
  private setupHostIncomingConnection(conn: DataConnection) {
    conn.on('open', () => {
      // 等待 JOIN_REQUEST
    });

    conn.on('data', (raw: any) => {
      const msg = raw as NetworkMessage;
      this.handleHostReceivedMessage(conn, msg);
    });

    conn.on('close', () => {
      this.handleGuestDisconnect(conn);
    });

    conn.on('error', () => {
      this.handleGuestDisconnect(conn);
    });
  }

  private handleHostReceivedMessage(conn: DataConnection, msg: NetworkMessage) {
    switch (msg.type) {
      case 'JOIN_REQUEST': {
        // 檢查是否滿員
        if (this.players.length >= this.settings.maxPlayers) {
          const rejectMsg: NetworkMessage = {
            type: 'JOIN_REJECTED',
            reason: `房間人數已滿 (上限 ${this.settings.maxPlayers} 人)`,
          };
          conn.send(rejectMsg);
          setTimeout(() => conn.close(), 500);
          return;
        }

        // 檢查遊戲是否已開始
        if (this.settings.status !== 'waiting') {
          const rejectMsg: NetworkMessage = {
            type: 'JOIN_REJECTED',
            reason: '遊戲已在進行中，請等待下局或加入其他房間',
          };
          conn.send(rejectMsg);
          setTimeout(() => conn.close(), 500);
          return;
        }

        const guestId = `guest-${Math.random().toString(36).substring(2, 9)}`;
        (conn as any).assignedPlayerId = guestId;
        this.connections.set(guestId, conn);

        const newPlayer: PlayerState = {
          id: guestId,
          name: msg.name.trim() || `挑戰者 ${this.players.length + 1}`,
          isHost: false,
          isReady: false,
          questionIndex: 0,
          currentProgress: 0,
          overallPercent: 0,
          cpm: 0,
          wpm: 0,
          accuracy: 100,
          combo: 0,
          isFinished: false,
          finishTime: null,
        };

        this.players.push(newPlayer);

        // 回覆客端已接受
        const acceptMsg: NetworkMessage = {
          type: 'JOIN_ACCEPTED',
          playerId: guestId,
          settings: this.settings,
          players: this.players,
        };
        conn.send(acceptMsg);

        // 向所有人廣播最新玩家名單
        this.broadcast({
          type: 'PLAYER_LIST_UPDATE',
          players: this.players,
          settings: this.settings,
        });

        this.emit('onPlayerListChange', this.players, this.settings);
        break;
      }

      case 'TOGGLE_READY': {
        const player = this.players.find((p) => p.id === msg.playerId);
        if (player) {
          player.isReady = msg.isReady;
          this.broadcast({
            type: 'PLAYER_LIST_UPDATE',
            players: this.players,
            settings: this.settings,
          });
          this.emit('onPlayerListChange', this.players, this.settings);
        }
        break;
      }

      case 'PROGRESS_UPDATE': {
        const target = this.players.find((p) => p.id === msg.playerId);
        if (target) {
          target.questionIndex = msg.questionIndex;
          target.currentProgress = msg.currentProgress;
          target.overallPercent = msg.overallPercent;
          target.cpm = msg.cpm;
          target.wpm = msg.wpm;
          target.accuracy = msg.accuracy;
          target.combo = msg.combo;
          target.isFinished = msg.isFinished;
          if (msg.finishTime !== undefined) {
            target.finishTime = msg.finishTime;
          }

          // 轉發給其他所有玩家
          this.broadcast(msg, msg.playerId);
          this.emit('onProgressUpdate', msg.playerId, target);
        }
        break;
      }

      case 'BATTLE_EVENT': {
        this.broadcast(msg);
        this.emit('onBattleEvent', msg.message, msg.eventType);
        break;
      }
    }
  }

  private handleGuestDisconnect(conn: DataConnection) {
    const guestId = (conn as any).assignedPlayerId;
    if (guestId) {
      this.connections.delete(guestId);
      const departingPlayer = this.players.find((p) => p.id === guestId);
      this.players = this.players.filter((p) => p.id !== guestId);
      
      this.broadcast({
        type: 'PLAYER_LIST_UPDATE',
        players: this.players,
        settings: this.settings,
      });
      this.emit('onPlayerListChange', this.players, this.settings);

      if (departingPlayer) {
        this.emit('onBattleEvent', `玩家 ${departingPlayer.name} 已離開房間`, 'combo');
      }
    }
  }

  // === 訪客加入房間 (Guest) ===
  public joinRoom(roomCode: string, guestName: string): Promise<PlayerState[]> {
    return new Promise((resolve, reject) => {
      this.destroy();

      const cleanCode = roomCode.trim().replace(/\D/g, '');
      if (cleanCode.length !== 6) {
        reject(new Error('房間密碼必須為 6 位數字'));
        return;
      }

      this.isHost = false;
      this.roomCode = cleanCode;
      this.myPlayerName = guestName.trim() || '連線玩家';
      const targetHostPeerId = `${P2P_PREFIX}${cleanCode}`;

      try {
        // 客端自己隨機生成 peer ID
        const myPeerId = `cty-guest-${cleanCode}-${Math.random().toString(36).substring(2, 9)}`;
        this.peer = new Peer(myPeerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        this.peer.on('open', () => {
          // 連向 Host
          const conn = this.peer!.connect(targetHostPeerId, { reliable: true });
          this.hostConnection = conn;

          let connectionTimeout = setTimeout(() => {
            reject(new Error('連線超時，找不到此 6 位數房間，請確認房號是否正確並已開房'));
            this.destroy();
          }, 8000);

          conn.on('open', () => {
            clearTimeout(connectionTimeout);
            // 送出加入請求
            conn.send({
              type: 'JOIN_REQUEST',
              name: this.myPlayerName,
            } as NetworkMessage);
          });

          conn.on('data', (raw: any) => {
            const msg = raw as NetworkMessage;
            this.handleGuestReceivedMessage(msg, resolve, reject);
          });

          conn.on('close', () => {
            this.emit('onDisconnected', '與房主之連線已中斷');
          });

          conn.on('error', (err) => {
            clearTimeout(connectionTimeout);
            reject(new Error(`無法連接到該房間: ${err?.message || '連線中斷'}`));
          });
        });

        this.peer.on('error', (err) => {
          reject(new Error(`連線失敗: ${err.message || err.type}`));
        });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  private handleGuestReceivedMessage(
    msg: NetworkMessage,
    onJoinResolved?: (players: PlayerState[]) => void,
    onJoinRejected?: (err: Error) => void
  ) {
    switch (msg.type) {
      case 'JOIN_ACCEPTED': {
        this.myPlayerId = msg.playerId;
        this.settings = msg.settings;
        this.players = msg.players;
        this.emit('onPlayerListChange', this.players, this.settings);
        onJoinResolved?.(this.players);
        break;
      }

      case 'JOIN_REJECTED': {
        onJoinRejected?.(new Error(msg.reason));
        this.emit('onError', msg.reason);
        this.destroy();
        break;
      }

      case 'PLAYER_LIST_UPDATE': {
        this.players = msg.players;
        this.settings = msg.settings;
        this.emit('onPlayerListChange', this.players, this.settings);
        break;
      }

      case 'GAME_START': {
        this.settings.status = 'in_game';
        this.emit('onGameStart', msg.questions, msg.startTime);
        break;
      }

      case 'PROGRESS_UPDATE': {
        const player = this.players.find((p) => p.id === msg.playerId);
        if (player) {
          player.questionIndex = msg.questionIndex;
          player.currentProgress = msg.currentProgress;
          player.overallPercent = msg.overallPercent;
          player.cpm = msg.cpm;
          player.wpm = msg.wpm;
          player.accuracy = msg.accuracy;
          player.combo = msg.combo;
          player.isFinished = msg.isFinished;
          if (msg.finishTime !== undefined) {
            player.finishTime = msg.finishTime;
          }
          this.emit('onProgressUpdate', msg.playerId, player);
        }
        break;
      }

      case 'BATTLE_EVENT': {
        this.emit('onBattleEvent', msg.message, msg.eventType);
        break;
      }

      case 'RETURN_TO_LOBBY': {
        this.settings.status = 'waiting';
        // 重置所有玩家準備狀態 (房主就緒，訪客未就緒)
        this.players.forEach((p) => {
          p.isReady = p.isHost;
          p.currentProgress = 0;
          p.overallPercent = 0;
          p.questionIndex = 0;
          p.isFinished = false;
          p.finishTime = null;
        });
        this.emit('onReturnToLobby');
        this.emit('onPlayerListChange', this.players, this.settings);
        break;
      }
    }
  }

  // === 房間互動方法 ===

  // 房主修改房間設定
  public updateRoomSettings(newSettings: Partial<RoomSettings>) {
    if (!this.isHost) return;
    this.settings = { ...this.settings, ...newSettings };
    this.broadcast({
      type: 'PLAYER_LIST_UPDATE',
      players: this.players,
      settings: this.settings,
    });
    this.emit('onPlayerListChange', this.players, this.settings);
  }

  // 客端切換準備狀態
  public setReady(isReady: boolean) {
    if (this.isHost) return;
    const player = this.players.find((p) => p.id === this.myPlayerId);
    if (player) {
      player.isReady = isReady;
    }
    if (this.hostConnection?.open) {
      this.hostConnection.send({
        type: 'TOGGLE_READY',
        playerId: this.myPlayerId,
        isReady,
      } as NetworkMessage);
    }
  }

  // 房主啟動遊戲
  public startGame(questions: QuestionItem[]) {
    if (!this.isHost) return;
    this.settings.status = 'in_game';
    const startTime = Date.now();

    // 廣播給所有玩家
    this.broadcast({
      type: 'GAME_START',
      questions,
      startTime,
    });

    this.emit('onGameStart', questions, startTime);
  }

  // 發送自己的打字進度
  public sendMyProgress(data: {
    questionIndex: number;
    currentProgress: number;
    overallPercent: number;
    cpm: number;
    wpm: number;
    accuracy: number;
    combo: number;
    isFinished: boolean;
    finishTime?: number;
  }) {
    // 更新本地
    const me = this.players.find((p) => p.id === this.myPlayerId);
    if (me) {
      Object.assign(me, data);
    }

    const msg: NetworkMessage = {
      type: 'PROGRESS_UPDATE',
      playerId: this.myPlayerId,
      ...data,
    };

    if (this.isHost) {
      this.broadcast(msg);
      this.emit('onProgressUpdate', this.myPlayerId, me!);
    } else if (this.hostConnection?.open) {
      this.hostConnection.send(msg);
      this.emit('onProgressUpdate', this.myPlayerId, me!);
    }
  }

  // 廣播對戰事件 (例如連擊、完賽)
  public sendBattleEvent(message: string, eventType: 'clear' | 'combo' | 'finish') {
    const msg: NetworkMessage = {
      type: 'BATTLE_EVENT',
      message,
      eventType,
    };
    if (this.isHost) {
      this.broadcast(msg);
      this.emit('onBattleEvent', message, eventType);
    } else if (this.hostConnection?.open) {
      this.hostConnection.send(msg);
      this.emit('onBattleEvent', message, eventType);
    }
  }

  // 房主命令全員返回大廳
  public returnToLobby() {
    if (!this.isHost) return;
    this.settings.status = 'waiting';
    this.players.forEach((p) => {
      p.isReady = p.isHost;
      p.currentProgress = 0;
      p.overallPercent = 0;
      p.questionIndex = 0;
      p.isFinished = false;
      p.finishTime = null;
    });

    this.broadcast({ type: 'RETURN_TO_LOBBY' });
    this.emit('onReturnToLobby');
    this.emit('onPlayerListChange', this.players, this.settings);
  }

  // 廣播給所有連線 (Host 專用)
  private broadcast(msg: NetworkMessage, excludePlayerId?: string) {
    if (!this.isHost) return;
    this.connections.forEach((conn, playerId) => {
      if (playerId !== excludePlayerId && conn.open) {
        conn.send(msg);
      }
    });
  }

  // 關閉並銷毀所有連線
  public destroy() {
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.isHost = false;
    this.roomCode = '';
    this.myPlayerId = '';
    this.players = [];
    this.settings.status = 'waiting';
  }
}
