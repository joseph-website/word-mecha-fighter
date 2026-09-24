// Web Audio API Synthesizer for tactile typing feedback
let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let soundVolume = 0.6;
let lastNonZeroVolume = 0.6;
let soundEnabled = true;

// Load initial values from localStorage if available
if (typeof window !== 'undefined') {
  try {
    const savedVol = localStorage.getItem('word_mecha_volume');
    if (savedVol !== null) {
      const v = parseFloat(savedVol);
      if (!isNaN(v)) {
        soundVolume = Math.max(0, Math.min(1, v));
        if (soundVolume > 0) lastNonZeroVolume = soundVolume;
      }
    }
    const savedEnabled = localStorage.getItem('word_mecha_sound_enabled');
    if (savedEnabled !== null) {
      soundEnabled = savedEnabled === 'true';
    }
  } catch {
    // Ignore storage issues
  }
}

function getMasterGain(ctx: AudioContext): GainNode {
  if (!masterGainNode) {
    masterGainNode = ctx.createGain();
    const effectiveVol = soundEnabled ? soundVolume : 0;
    masterGainNode.gain.setValueAtTime(effectiveVol, ctx.currentTime);
    masterGainNode.connect(ctx.destination);
  }
  return masterGainNode;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
      getMasterGain(audioCtx);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getVolume(): number {
  return soundVolume;
}

export function setVolume(vol: number): number {
  soundVolume = Math.max(0, Math.min(1, vol));
  if (soundVolume > 0) {
    lastNonZeroVolume = soundVolume;
    soundEnabled = true;
  } else {
    soundEnabled = false;
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('word_mecha_volume', String(soundVolume));
      localStorage.setItem('word_mecha_sound_enabled', String(soundEnabled));
    } catch {
      // Ignore
    }
  }

  const ctx = getAudioContext();
  if (ctx && masterGainNode) {
    masterGainNode.gain.setValueAtTime(soundEnabled ? soundVolume : 0, ctx.currentTime);
  }

  return soundVolume;
}

export function toggleSound(enabled?: boolean): boolean {
  if (enabled !== undefined) {
    soundEnabled = enabled;
  } else {
    soundEnabled = !soundEnabled;
  }

  if (soundEnabled && soundVolume === 0) {
    soundVolume = lastNonZeroVolume > 0 ? lastNonZeroVolume : 0.6;
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('word_mecha_sound_enabled', String(soundEnabled));
      localStorage.setItem('word_mecha_volume', String(soundVolume));
    } catch {
      // Ignore
    }
  }

  const ctx = getAudioContext();
  if (ctx && masterGainNode) {
    masterGainNode.gain.setValueAtTime(soundEnabled ? soundVolume : 0, ctx.currentTime);
  }

  return soundEnabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * 鍵盤敲擊聲 (輕脆微木質質感)
 */
export function playKeyStrokeSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 + Math.random() * 80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(getMasterGain(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // ignore audio failure
  }
}

/**
 * 打對正確字元的清脆提示音 (柔和甘甜短音)
 */
export function playCorrectSound(combo = 0) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 隨著連擊數稍微提高頻率
    const baseFreq = 523.25; // C5
    const pitchShift = Math.min(combo * 12, 300);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq + pitchShift, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq + pitchShift + 80, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(getMasterGain(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // ignore
  }
}

/**
 * 打錯字提示音 (短促低沉柔和提示)
 */
export function playErrorSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(getMasterGain(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // ignore
  }
}

/**
 * 順利通過題目提示音 (小三和弦)
 */
export function playQuestionCompleteSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + index * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(getMasterGain(ctx));

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  } catch {
    // ignore
  }
}

/**
 * 射擊雷射發射音效
 */
export function playLaserShotSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(getMasterGain(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch {
    // ignore
  }
}

/**
 * 擊破爆炸音效
 */
export function playExplosionSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // 雙振盪器模擬爆炸轟鳴
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(180, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.35);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(120, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(getMasterGain(ctx));

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.42);
    osc2.stop(ctx.currentTime + 0.42);
  } catch {
    // ignore
  }
}

/**
 * 完美擊破 (100% 全對) 專屬勝利清脆高音與和弦樂音
 */
export function playPerfectClearSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + index * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);

      osc.connect(gain);
      gain.connect(getMasterGain(ctx));

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch {
    // ignore
  }
}

/**
 * 結算勝利歡呼樂音
 */
export function playVictorySound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + index * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(getMasterGain(ctx));

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch {
    // ignore
  }
}

/**
 * 開局 5 秒倒數逼聲與開始號角音效
 */
export function playCountdownBeep(isStart: boolean = false) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (isStart) {
      // 開始提示高音和弦
      const chord = [659.25, 880, 1318.5]; // E5, A5, E6
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(getMasterGain(ctx));
        osc.start();
        osc.stop(ctx.currentTime + 0.38);
      });
    } else {
      // 倒數 5, 4, 3, 2, 1 提示短音
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(getMasterGain(ctx));
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    }
  } catch {
    // ignore
  }
}

/**
 * 跳過題目懲罰音效 (雙重低沉警示音)
 */
export function playPenaltySound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, ctx.currentTime); // A3
    osc1.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.15);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(getMasterGain(ctx));
    osc1.start();
    osc1.stop(ctx.currentTime + 0.16);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(160, ctx.currentTime + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.35);
    gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);
    osc2.connect(gain2);
    gain2.connect(getMasterGain(ctx));
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.4);
  } catch {
    // ignore
  }
}

/**
 * 連擊能量激增 / 充能音效 (5、10、15 等連擊時觸發機械充能上升音階)
 */
export function playComboSurgeSound(combo: number) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const baseFreq = combo >= 10 ? 587.33 : 440; // D5 或 A4
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]; // 大三度與完全五度充能音階
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.14, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(getMasterGain(ctx));
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
    });
  } catch {
    // ignore
  }
}

