/**
 * 効果音（WebAudioで合成。音声ファイル不要）
 * iOSはユーザー操作中に AudioContext を resume する必要がある。
 */
let ac: AudioContext | null = null;

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
  }
  if (ac.state === 'suspended') void ac.resume();
  return ac;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slideTo?: number) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let watercolorNoise: AudioBufferSourceNode | null = null;
let watercolorFilter: BiquadFilterNode | null = null;
let watercolorGain: GainNode | null = null;

export const sfx = {
  pop: () => tone(520, 0.12, 'sine', 0.18, 880),
  select: () => tone(740, 0.09, 'triangle', 0.12, 990),
  back: () => tone(600, 0.12, 'sine', 0.12, 380),
  clear: () => {
    tone(880, 0.12, 'triangle', 0.12, 440);
    setTimeout(() => tone(660, 0.18, 'triangle', 0.12, 220), 90);
  },
  save: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.12), i * 80));
  },
  startWatercolor: () => {
    const a = ctx();
    if (!a || watercolorNoise) return;
    
    const bufferSize = a.sampleRate * 1;
    const buffer = a.createBuffer(1, bufferSize, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    watercolorNoise = a.createBufferSource();
    watercolorNoise.buffer = buffer;
    watercolorNoise.loop = true;
    
    watercolorFilter = a.createBiquadFilter();
    watercolorFilter.type = 'lowpass';
    watercolorFilter.frequency.value = 800; // soft friction sound
    
    watercolorGain = a.createGain();
    watercolorGain.gain.value = 0.03; // subtle volume
    
    watercolorNoise.connect(watercolorFilter).connect(watercolorGain).connect(a.destination);
    watercolorNoise.start();
  },
  stopWatercolor: () => {
    if (watercolorNoise) {
      watercolorNoise.stop();
      watercolorNoise.disconnect();
      watercolorNoise = null;
    }
    if (watercolorFilter) {
      watercolorFilter.disconnect();
      watercolorFilter = null;
    }
    if (watercolorGain) {
      watercolorGain.disconnect();
      watercolorGain = null;
    }
  }
};

import completeBgmUrl from '../assets/BGM/complete.mp3';
export { completeBgmUrl };

let mainBgm: HTMLAudioElement | null = null;
let mainBgmUrl: string | null = null;

let fanfareBgm: HTMLAudioElement | null = null;
let fanfarePausedMain = false;

export const bgm = {
  /**
   * メインBGMを再生（同じURLが既に再生中ならそのまま継続）
   * 別のBGMが再生中なら、完全に停止してから新しいBGMを再生する。
   * これにより、開始画面BGMとジャンルBGMなどが二重にかかるのを完全に防止する。
   */
  play: (url: string, volume = 0.3) => {
    // ファンファーレが鳴っていれば停止
    if (fanfareBgm) {
      fanfareBgm.pause();
      fanfareBgm.currentTime = 0;
      fanfareBgm = null;
      fanfarePausedMain = false;
    }

    if (mainBgmUrl === url && mainBgm) {
      if (mainBgm.paused) {
        mainBgm.play().catch(e => console.error(e));
      }
      return;
    }

    // 既存のメインBGMを完全停止
    if (mainBgm) {
      mainBgm.pause();
      mainBgm.currentTime = 0;
      mainBgm = null;
      mainBgmUrl = null;
    }

    mainBgmUrl = url;
    mainBgm = new Audio(url);
    mainBgm.loop = true;
    mainBgm.volume = volume;
    mainBgm.play().catch(e => console.error('BGM Play Error:', e));
  },

  /** タイトル・ジャンル選択画面用BGM（complete.mp3）を再生 */
  playTitle: () => {
    bgm.play(completeBgmUrl, 0.35);
  },

  /** 全てのBGMを完全停止 */
  stop: () => {
    if (fanfareBgm) {
      fanfareBgm.pause();
      fanfareBgm.currentTime = 0;
      fanfareBgm = null;
      fanfarePausedMain = false;
    }
    if (mainBgm) {
      mainBgm.pause();
      mainBgm.currentTime = 0;
      mainBgm = null;
      mainBgmUrl = null;
    }
  },

  /**
   * お絵かき完成時のファンファーレ再生（PlayScreen用）
   * 現在のメインBGM（ジャンル曲）を一時停止し、ファンファーレを流す。
   */
  playFanfare: () => {
    if (fanfareBgm) {
      fanfareBgm.pause();
      fanfareBgm.currentTime = 0;
      fanfareBgm = null;
    }
    if (mainBgm && !mainBgm.paused) {
      mainBgm.pause();
      fanfarePausedMain = true;
    } else {
      fanfarePausedMain = false;
    }

    fanfareBgm = new Audio(completeBgmUrl);
    fanfareBgm.loop = true;
    fanfareBgm.volume = 0.4;
    fanfareBgm.play().catch(e => console.error('Fanfare Play Error:', e));
  },

  /** お絵かき完成モーダルを閉じたときのファンファーレ停止 */
  stopFanfare: () => {
    if (fanfareBgm) {
      fanfareBgm.pause();
      fanfareBgm.currentTime = 0;
      fanfareBgm = null;
    }
    if (fanfarePausedMain && mainBgm && mainBgm.paused) {
      mainBgm.play().catch(e => console.error('BGM Resume Error:', e));
    }
    fanfarePausedMain = false;
  },

  // 互換性・同等呼び出し用エイリアス
  playComplete: () => {
    bgm.playFanfare();
  },
  stopComplete: () => {
    bgm.stopFanfare();
  }
};

let wasMainPlayingBeforeHidden = false;
let wasFanfarePlayingBeforeHidden = false;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasMainPlayingBeforeHidden = !!(mainBgm && !mainBgm.paused);
      wasFanfarePlayingBeforeHidden = !!(fanfareBgm && !fanfareBgm.paused);
      if (mainBgm) mainBgm.pause();
      if (fanfareBgm) fanfareBgm.pause();
    } else {
      if (wasFanfarePlayingBeforeHidden && fanfareBgm) {
        fanfareBgm.play().catch(e => console.error(e));
      } else if (wasMainPlayingBeforeHidden && mainBgm) {
        mainBgm.play().catch(e => console.error(e));
      }
    }
  });
}
