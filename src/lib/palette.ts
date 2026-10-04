/**
 * カラーパレット & パターン定義
 */

export const RAINBOW = 'rainbow';

export interface ColorSwatch {
  id: string;
  value: string; // #hex または 'rainbow'
  name: string;
}

export const COLORS: ColorSwatch[] = [
  { id: 'rainbow', value: RAINBOW, name: 'にじいろ' },
  { id: 'red', value: '#ff3b3b', name: 'あか' },
  { id: 'coral', value: '#ff6f61', name: 'さんごいろ' },
  { id: 'orange', value: '#ff9f1c', name: 'オレンジ' },
  { id: 'mango', value: '#ffc93c', name: 'マンゴー' },
  { id: 'yellow', value: '#ffe94e', name: 'きいろ' },
  { id: 'lime', value: '#c5e84a', name: 'きみどり' },
  { id: 'green', value: '#5ed16a', name: 'みどり' },
  { id: 'forest', value: '#1fa968', name: 'ふかみどり' },
  { id: 'mint', value: '#3ed9c8', name: 'ミント' },
  { id: 'sky', value: '#4cc3ff', name: 'みずいろ' },
  { id: 'blue', value: '#2f80ed', name: 'あお' },
  { id: 'navy', value: '#3d4ed8', name: 'こん' },
  { id: 'purple', value: '#8b5cf6', name: 'むらさき' },
  { id: 'lavender', value: '#c084fc', name: 'ラベンダー' },
  { id: 'pink', value: '#ff7eb6', name: 'ピンク' },
  { id: 'magenta', value: '#ff4f9a', name: 'ローズ' },
  { id: 'sakura', value: '#ffc2d9', name: 'さくら' },
  { id: 'peach', value: '#f9d5b3', name: 'はだいろ' },
  { id: 'tan', value: '#d9a066', name: 'きつねいろ' },
  { id: 'brown', value: '#8d5a3b', name: 'ちゃいろ' },
  { id: 'choco', value: '#5b3a29', name: 'チョコ' },
  { id: 'white', value: '#ffffff', name: 'しろ' },
  { id: 'gray', value: '#a0a4ab', name: 'はいいろ' },
  { id: 'black', value: '#2b2b35', name: 'くろ' },
];

export type PatternType =
  | 'stripe'
  | 'dot'
  | 'check'
  | 'heart'
  | 'star'
  | 'wave'
  | 'zigzag'
  | 'rainbow'
  | 'flower'
  | 'gingham';

export interface PatternSwatch {
  id: string;
  type: PatternType;
  bg: string;
  fg: string;
}

export const PATTERNS: PatternSwatch[] = [
  { id: 'p-stripe1', type: 'stripe', bg: '#ffffff', fg: '#ff7eb6' },
  { id: 'p-stripe2', type: 'stripe', bg: '#ffe94e', fg: '#2f80ed' },
  { id: 'p-dot1', type: 'dot', bg: '#ff3b3b', fg: '#ffffff' },
  { id: 'p-dot2', type: 'dot', bg: '#3d4ed8', fg: '#ffe94e' },
  { id: 'p-check1', type: 'check', bg: '#fff3d6', fg: '#ff9f1c' },
  { id: 'p-check2', type: 'check', bg: '#c5e84a', fg: '#1fa968' },
  { id: 'p-heart1', type: 'heart', bg: '#ffc2d9', fg: '#ff4f9a' },
  { id: 'p-heart2', type: 'heart', bg: '#ffffff', fg: '#ff3b3b' },
  { id: 'p-star1', type: 'star', bg: '#2b2f6b', fg: '#ffe94e' },
  { id: 'p-star2', type: 'star', bg: '#4cc3ff', fg: '#ffffff' },
  { id: 'p-wave1', type: 'wave', bg: '#cdeeff', fg: '#2f80ed' },
  { id: 'p-wave2', type: 'wave', bg: '#d9fff8', fg: '#1fb5a4' },
  { id: 'p-zig1', type: 'zigzag', bg: '#eadcff', fg: '#8b5cf6' },
  { id: 'p-zig2', type: 'zigzag', bg: '#ffe94e', fg: '#ff6f61' },
  { id: 'p-rainbow1', type: 'rainbow', bg: '#ffffff', fg: 'vivid' },
  { id: 'p-rainbow2', type: 'rainbow', bg: '#ffffff', fg: 'pastel' },
  { id: 'p-flower1', type: 'flower', bg: '#5ed16a', fg: '#ffffff' },
  { id: 'p-flower2', type: 'flower', bg: '#fff3d6', fg: '#ff7eb6' },
  { id: 'p-gingham1', type: 'gingham', bg: '#ffffff', fg: '#ff3b3b' },
  { id: 'p-gingham2', type: 'gingham', bg: '#ffffff', fg: '#2f80ed' },
];

/** パターンタイルのピクセルサイズ（Canvas実ピクセル） */
export const TILE = 64;

const heartPath = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9);
  ctx.closePath();
};

const starPath = (ctx: CanvasRenderingContext2D, x: number, y: number, R: number, r: number) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    ctx.lineTo(x + rad * Math.cos(a), y + rad * Math.sin(a));
  }
  ctx.closePath();
};

/** シームレスにタイリングできるパターンタイルを描画 */
export function drawTile(ctx: CanvasRenderingContext2D, p: PatternSwatch, S = TILE) {
  const u = S / 64;
  ctx.save();
  ctx.scale(u, u);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = p.fg;
  ctx.strokeStyle = p.fg;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (p.type) {
    case 'stripe':
      ctx.lineWidth = 11;
      ctx.lineCap = 'butt';
      for (let o = -64; o <= 64; o += 32) {
        ctx.beginPath();
        ctx.moveTo(o - 8, 72);
        ctx.lineTo(o + 72, -8);
        ctx.stroke();
      }
      break;
    case 'dot':
      for (const [x, y] of [
        [16, 16],
        [48, 48],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'check':
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillRect(32, 32, 32, 32);
      break;
    case 'heart':
      heartPath(ctx, 18, 18, 10);
      ctx.fill();
      heartPath(ctx, 50, 50, 10);
      ctx.fill();
      break;
    case 'star':
      starPath(ctx, 18, 18, 12, 5);
      ctx.fill();
      starPath(ctx, 50, 50, 9, 4);
      ctx.fill();
      break;
    case 'wave':
      ctx.lineWidth = 7;
      for (const base of [16, 48]) {
        ctx.beginPath();
        for (let x = -2; x <= 66; x += 2) {
          ctx.lineTo(x, base + 7 * Math.sin((x / 64) * Math.PI * 4));
        }
        ctx.stroke();
      }
      break;
    case 'zigzag':
      ctx.lineWidth = 7;
      for (const base of [16, 48]) {
        ctx.beginPath();
        ctx.moveTo(-8, base + 8);
        for (let i = 0; i <= 5; i++) ctx.lineTo(i * 16, base + (i % 2 ? 8 : -8));
        ctx.stroke();
      }
      break;
    case 'rainbow': {
      const cols =
        p.fg === 'pastel'
          ? ['#ffb3c1', '#ffd6a5', '#fdffb6', '#caffbf', '#a0e7ff', '#cdb4ff']
          : ['#ff3b3b', '#ff9f1c', '#ffe94e', '#5ed16a', '#4cc3ff', '#8b5cf6'];
      const h = 64 / cols.length;
      cols.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(0, i * h, 64, h + 0.5);
      });
      break;
    }
    case 'flower':
      for (const [cx, cy, s] of [
        [18, 18, 1],
        [50, 50, 0.8],
      ]) {
        ctx.fillStyle = p.fg;
        for (let k = 0; k < 5; k++) {
          const a = (k * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * 7 * s, cy + Math.sin(a) * 7 * s, 5.5 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffc93c';
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'gingham':
      ctx.globalAlpha = 0.45;
      ctx.fillRect(0, 0, 64, 16);
      ctx.fillRect(0, 32, 64, 16);
      ctx.fillRect(0, 0, 16, 64);
      ctx.fillRect(32, 0, 16, 64);
      break;
  }
  ctx.restore();
}

const tileCache = new Map<string, HTMLCanvasElement>();
export function getTileCanvas(p: PatternSwatch): HTMLCanvasElement {
  let c = tileCache.get(p.id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = TILE;
    drawTile(c.getContext('2d')!, p);
    tileCache.set(p.id, c);
  }
  return c;
}

const urlCache = new Map<string, string>();
/** パレットのスウォッチ表示用 dataURL */
export function getTileDataUrl(p: PatternSwatch): string {
  let u = urlCache.get(p.id);
  if (!u) {
    u = getTileCanvas(p).toDataURL();
    urlCache.set(p.id, u);
  }
  return u;
}

/* ---- 色ユーティリティ ---- */
export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** 白と混ぜて明るくする (t=0:元色, t=1:白) */
export function tint(hex: string, t: number) {
  const [r, g, b] = hexToRgb(hex);
  const m = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/** 黒と混ぜて暗くする */
export function shade(hex: string, t: number) {
  const [r, g, b] = hexToRgb(hex);
  const m = (c: number) => Math.round(c * (1 - t));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
