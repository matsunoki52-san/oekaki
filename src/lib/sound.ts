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

let watercolorNoise: AudioBufferSourceNode | null = null;
let watercolorFilter: BiquadFilterNode | null = null;
let watercolorGain: GainNode | null = null;

let currentBgm: HTMLAudioElement | null = null;
let currentBgmUrl: string | null = null;
let completeBgm: HTMLAudioElement | null = null;

export const bgm = {
  play: (url: string) => {
    if (currentBgmUrl === url && currentBgm) {
      if (currentBgm.paused) {
        currentBgm.play().catch(e => console.error(e));
      }
      return;
    }
    bgm.stop();
    currentBgmUrl = url;
    currentBgm = new Audio(url);
    currentBgm.loop = true;
    currentBgm.volume = 0.3; // slightly lower volume
    currentBgm.play().catch(e => console.error('BGM Play Error:', e));
  },
  stop: () => {
    if (currentBgm) {
      currentBgm.pause();
      currentBgm.currentTime = 0;
      currentBgm = null;
      currentBgmUrl = null;
    }
  },
  playComplete: () => {
    if (currentBgm && !currentBgm.paused) {
      currentBgm.pause(); // 既存BGMを一時停止
    }
    if (!completeBgm) {
      import('../assets/BGM/complete.mp3').then((mod) => {
        completeBgm = new Audio(mod.default);
        completeBgm.loop = true;
        completeBgm.volume = 0.4;
        completeBgm.currentTime = 0;
        completeBgm.play().catch(e => console.error('Complete BGM Play Error:', e));
      });
      return;
    }
    completeBgm.currentTime = 0;
    completeBgm.play().catch(e => console.error('Complete BGM Play Error:', e));
  },
  stopComplete: () => {
    if (completeBgm) {
      completeBgm.pause();
      completeBgm.currentTime = 0;
    }
    // 通常BGMを再開
    if (currentBgm && currentBgm.paused) {
      currentBgm.play().catch(e => console.error('BGM Resume Error:', e));
    }
  }
};
