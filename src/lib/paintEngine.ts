/**
 * PaintEngine
 * ------------------------------------------------------------------
 * 背面 <canvas> への描画をすべて担当するクラス。
 *
 * ■ 座標系
 *   Canvas の実ピクセルは viewBox の RES 倍 (1024x768 → 2048x1536)。
 *   ctx.setTransform(RES, 0, 0, RES, 0, 0) を常に掛けておくことで、
 *   以降の描画・Path2D・clip はすべて SVG の viewBox 座標のまま扱える。
 *
 * ■ はみ出し防止
 *   begin(): ctx.save() → ctx.clip(タッチした部位)
 *   move():  clip が効いたまま描画（指が別の部位に移動しても最初の部位の内側だけ）
 *   end():   ctx.restore() でクリップ解除
 *
 * ■ ペンの太さ
 *   BASE_SIZE を「一番細い状態（最小値）」とし、Brush.sizeScale（1.0〜3.0）で拡大。
 */
import { VB_H, VB_W } from '../data/artworks';
import { PATTERNS, RAINBOW, getTileCanvas, shade, tint } from './palette';

export type ToolId = 'pen' | 'pattern' | 'glitter' | 'spray' | 'eraser';

export interface Brush {
  tool: ToolId;
  color: string; // '#rrggbb' または 'rainbow'
  patternId: string;
  sizeScale: number; // 1.0 (最小・標準) 〜 3.0+
}

export interface Pt {
  x: number;
  y: number;
}

/** viewBox 1単位あたりの Canvas 実ピクセル数（Retina でもくっきり） */
export const RES = 2;

/**
 * 基準ブラシサイズ（viewBox 単位）。
 * 要件: この値を「一番細い状態（最小値）」として設定し、スライダーでさらに太くできるようにする。
 */
const BASE_SIZE = {
  pen: 36,
  pattern: 44,
  glitter: 36,
  sprayRadius: 46,
  eraser: 58,
} as const;

/** 台紙全体より少し大きい矩形（必要に応じて重ね合わせ除外に使用） */
const OUTER = `M-64 -64H${VB_W + 64}V${VB_H + 64}H-64Z`;

interface Sparkle {
  x: number;
  y: number;
  size: number;
  rot: number;
  color: string;
  kind: 'star4' | 'star5' | 'dot' | 'halo';
  age: number;
  life: number;
}

export class PaintEngine {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  private brush: Brush = { tool: 'pen', color: '#ff3b3b', patternId: PATTERNS[0].id, sizeScale: 1.0 };
  private drawing = false;
  private last: Pt | null = null;
  private cur: Pt | null = null;
  private carry = 0; // パーティクル放出用の移動距離の繰り越し
  private hue = Math.random() * 360;
  private sparkles: Sparkle[] = [];
  private raf = 0;

  private pathCache = new Map<string, Path2D>();
  private patternCache = new Map<string, CanvasPattern>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = VB_W * RES;
    canvas.height = VB_H * RES;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    // ★ viewBox 座標 → Canvas 実ピクセル のスケーリング
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
  }

  get isDrawing() {
    return this.drawing;
  }

  setBrush(b: Brush) {
    this.brush = b;
  }

  private get scale(): number {
    return Math.max(1, this.brush.sizeScale || 1.0);
  }

  private get currentLineWidth(): number {
    const s = this.scale;
    switch (this.brush.tool) {
      case 'pen':
        return BASE_SIZE.pen * s;
      case 'pattern':
        return BASE_SIZE.pattern * s;
      case 'glitter':
        return BASE_SIZE.glitter * s;
      case 'eraser':
        return BASE_SIZE.eraser * s;
      case 'spray':
        return BASE_SIZE.sprayRadius * s;
    }
  }

  /* ================================================================
   * 1. タッチ開始：クリッピングマスクを設定
   * ================================================================ */
  /**
   * @param regionD    タッチされた <path> の d 属性（＝アクティブ領域）
   * @param occluderDs オプション: その部位より手前にある部位の d 属性群
   * @param p          タッチ座標（viewBox 座標）
   */
  begin(regionD: string, occluderDs: string[] = [], p: Pt) {
    if (this.drawing) this.end();
    const ctx = this.ctx;

    ctx.save();
    // ① タッチした部位の内側だけに描画を限定
    ctx.clip(this.path(regionD));

    // ② 重複がある場合の保険（手前部位の除外）
    if (occluderDs.length > 0) {
      for (const d of occluderDs) {
        ctx.clip(this.path(OUTER + d), 'evenodd');
      }
    }

    this.applyStyle();
    this.drawing = true;
    this.last = p;
    this.cur = p;
    this.carry = 0;
    this.stamp(p);
    this.startLoop();
  }

  /* ================================================================
   * 2. なぞり中：clip が効いた状態で描画
   * ================================================================ */
  move(p: Pt) {
    if (!this.drawing || !this.last) return;
    const a = this.last;
    if (Math.hypot(p.x - a.x, p.y - a.y) < 0.5) return;
    this.segment(a, p);
    this.last = p;
    this.cur = p;
  }

  /* ================================================================
   * 3. タッチ終了：クリップ解除
   * ================================================================ */
  end() {
    if (!this.drawing) return;
    cancelAnimationFrame(this.raf);
    // 成長途中のキラキラを最終サイズで確定させてから clip を外す
    for (const s of this.sparkles) {
      s.age = s.life;
      this.drawSparkle(s);
    }
    this.sparkles = [];
    this.ctx.restore(); // ← ctx.save() と対になり clip / 合成モードが元に戻る
    this.drawing = false;
    this.last = this.cur = null;
  }

  /** 一括削除 */
  clear() {
    if (this.drawing) this.end();
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  /** Undo用: 現在のピクセル状態をスナップショットとして取得 */
  getImageData(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Undo用: スナップショットをCanvasへ復元 */
  putImageData(data: ImageData) {
    if (this.drawing) this.end();
    this.ctx.putImageData(data, 0, 0);
  }

  /** 保存済み画像を読み込み */
  load(img: CanvasImageSource) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  toBlob(): Promise<Blob | null> {
    return new Promise((res) => this.canvas.toBlob(res, 'image/png'));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
  }

  /* ---------------------------------------------------------------- */
  /* 内部処理                                                          */
  /* ---------------------------------------------------------------- */

  private path(d: string) {
    let p = this.pathCache.get(d);
    if (!p) {
      p = new Path2D(d);
      this.pathCache.set(d, p);
    }
    return p;
  }

  private pattern(id: string) {
    let pat = this.patternCache.get(id);
    if (!pat) {
      const sw = PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];
      pat = this.ctx.createPattern(getTileCanvas(sw), 'repeat')!;
      pat.setTransform(new DOMMatrix([1 / RES, 0, 0, 1 / RES, 0, 0]));
      this.patternCache.set(id, pat);
    }
    return pat;
  }

  private get isRainbow() {
    return this.brush.color === RAINBOW;
  }

  /** 現在色（にじいろは呼ぶたびに色相が進む） */
  private nextColor(step = 2.5) {
    if (!this.isRainbow) return this.brush.color;
    this.hue = (this.hue + step) % 360;
    return `hsl(${this.hue}, 92%, 58%)`;
  }

  /** 基準色の hex（にじいろ時は現在色相の近似色） */
  private baseHex() {
    if (!this.isRainbow) return this.brush.color;
    const s = 0.92;
    const l = 0.58;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + this.hue / 30) % 12;
      const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(c * 255)
        .toString(16)
        .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  private applyStyle() {
    const ctx = this.ctx;
    const { tool } = this.brush;
    const lw = this.currentLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;
    // ★ 消しゴム：Canvas 上の描画だけを透明に抜く（前面 SVG の主線は無関係）
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

    switch (tool) {
      case 'pen':
        ctx.lineWidth = lw;
        ctx.strokeStyle = ctx.fillStyle = this.brush.color === RAINBOW ? '#000' : this.brush.color;
        break;
      case 'pattern': {
        const pat = this.pattern(this.brush.patternId);
        ctx.lineWidth = lw;
        ctx.strokeStyle = ctx.fillStyle = pat;
        break;
      }
      case 'glitter':
        ctx.lineWidth = lw;
        break;
      case 'eraser':
        ctx.lineWidth = lw;
        ctx.strokeStyle = ctx.fillStyle = '#000';
        break;
      case 'spray':
        break;
    }
  }

  /** タップしただけでも色が付くように */
  private stamp(p: Pt) {
    const ctx = this.ctx;
    const { tool } = this.brush;
    const lw = this.currentLineWidth;

    switch (tool) {
      case 'pen':
      case 'pattern':
      case 'eraser': {
        if (tool === 'pen' && this.isRainbow) ctx.fillStyle = this.nextColor();
        ctx.beginPath();
        ctx.arc(p.x, p.y, lw / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'glitter': {
        // グリッターペン: タップ時にふんわりとした光の粒と星を放出
        const count = Math.round(8 * this.scale);
        for (let i = 0; i < count; i++) this.emitSparkle(p);
        this.speck(p);
        break;
      }
      case 'spray':
        this.sprayAt(p, Math.round(26 * this.scale));
        break;
    }
  }

  /** 線分 a→b を描画 */
  private segment(a: Pt, b: Pt) {
    const ctx = this.ctx;
    const { tool } = this.brush;
    const line = (style?: string | CanvasPattern) => {
      if (style) ctx.strokeStyle = style;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };

    switch (tool) {
      case 'pen':
        line(this.isRainbow ? this.nextColor() : undefined);
        break;
      case 'pattern':
      case 'eraser':
        line();
        break;
      case 'glitter': {
        // ★ グリッターペン要件:
        // 単なるベタ塗りではなく、軌跡の周囲にランダムな大きさの星や光るドット（パーティクル）が散らばる描画ロジック。
        // 半透明の優しい光沢コアを描き、その周囲にキラキラ星と光るドットを密に散布。
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = this.currentLineWidth * 0.7;
        line(tint(this.baseHex(), 0.5));
        ctx.restore();

        if (this.isRainbow) this.nextColor(4);
        const spacing = Math.max(6, 12 / this.scale);
        this.alongSegment(a, b, spacing, (p) => {
          this.emitSparkle(p);
          if (Math.random() < 0.8) this.emitSparkle(p);
          this.speck(p);
        });
        break;
      }
      case 'spray': {
        const spacing = Math.max(5, 8 / this.scale);
        this.alongSegment(a, b, spacing, (p) => this.sprayAt(p, Math.round(8 * Math.sqrt(this.scale))));
        break;
      }
    }
  }

  /** a→b 上を spacing ごとに cb を呼ぶ（端数は次回に繰り越し） */
  private alongSegment(a: Pt, b: Pt, spacing: number, cb: (p: Pt) => void) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    let t = spacing - this.carry;
    while (t <= len) {
      const k = t / len;
      cb({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
      t += spacing;
    }
    this.carry = len - (t - spacing);
  }

  /* ---------------- requestAnimationFrame ループ ---------------- */
  private startLoop() {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      if (!this.drawing) return;
      const { tool } = this.brush;
      // スプレー：指を止めていても噴射し続ける
      if (tool === 'spray' && this.cur) {
        this.sprayAt(this.cur, Math.round(28 * Math.sqrt(this.scale)));
      }
      // グリッター：指を止めている場所でもキラキラが湧き出る
      if (tool === 'glitter' && this.cur && Math.random() < 0.6) {
        this.emitSparkle(this.cur);
      }
      // キラキラ粒子を成長・確定させる
      if (this.sparkles.length) {
        for (const s of this.sparkles) {
          s.age++;
          this.drawSparkle(s);
        }
        this.sparkles = this.sparkles.filter((s) => s.age < s.life);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /* ---------------- スプレー ---------------- */
  /**
   * 半径 R の円内にランダムな粒を count 個描く。
   * r = R * rand^0.7 で中心ほど密度が高い、エアブラシらしい分布。
   */
  private sprayAt(p: Pt, count: number) {
    const ctx = this.ctx;
    const R = BASE_SIZE.sprayRadius * this.scale;
    const color = this.nextColor(0.8);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = R * Math.pow(Math.random(), 0.72);
      const x = p.x + Math.cos(ang) * r;
      const y = p.y + Math.sin(ang) * r;
      const s = (0.9 + Math.random() * 1.9) * Math.sqrt(this.scale);
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- グリッター（キラキラ）ペン ---------------- */
  private emitSparkle(p: Pt) {
    const base = this.baseHex();
    const spread = (BASE_SIZE.glitter * this.scale) * 0.85;
    const ang = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.6) * spread;
    const roll = Math.random();

    let kind: Sparkle['kind'];
    if (roll < 0.45) kind = 'star4';
    else if (roll < 0.7) kind = 'star5';
    else if (roll < 0.88) kind = 'dot';
    else kind = 'halo';

    const palette = this.isRainbow
      ? [
          `hsl(${Math.random() * 360},95%,65%)`,
          '#ffffff',
          '#fff9c4',
          '#b3e5fc',
          '#ffd54f',
        ]
      : [
          '#ffffff',
          '#ffffff',
          tint(base, 0.65),
          tint(base, 0.35),
          shade(base, 0.15),
          '#ffe082',
        ];

    const baseStarSize = (6 + Math.random() * 10) * Math.sqrt(this.scale);

    this.sparkles.push({
      x: p.x + Math.cos(ang) * r,
      y: p.y + Math.sin(ang) * r,
      size: kind === 'dot' ? (2 + Math.random() * 3.5) * Math.sqrt(this.scale) : baseStarSize,
      rot: Math.random() * Math.PI * 2,
      color: palette[Math.floor(Math.random() * palette.length)],
      kind,
      age: 0,
      life: 8 + Math.floor(Math.random() * 8),
    });
  }

  /** 下地の上に散らす小さな光の粒（即時） */
  private speck(p: Pt) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const s = (BASE_SIZE.glitter * this.scale) * 0.55;
    ctx.beginPath();
    ctx.arc(
      p.x + (Math.random() - 0.5) * s * 1.8,
      p.y + (Math.random() - 0.5) * s * 1.8,
      (0.9 + Math.random() * 1.5) * Math.sqrt(this.scale),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  /** 粒子を現在の成長度で描画 */
  private drawSparkle(s: Sparkle) {
    const ctx = this.ctx;
    const t = Math.min(1, s.age / s.life);
    const k = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const size = Math.max(0.4, s.size * k);

    ctx.save();
    ctx.translate(s.x, s.y);

    if (s.kind === 'dot') {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-size * 0.25, -size * 0.25, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (s.kind === 'halo') {
      // ぽわんと光るグロードット
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.rotate(s.rot + k * 0.4);

    if (s.kind === 'star5') {
      // 5方向の可愛い星型
      ctx.fillStyle = s.color;
      ctx.beginPath();
      const R = size;
      const r = size * 0.45;
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? R : r;
        ctx.lineTo(rad * Math.cos(a), rad * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
      // 中心の光
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // 4方向のキラキラダイヤモンド星
    ctx.fillStyle = s.color;
    const w = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(w, -w, size, 0);
    ctx.quadraticCurveTo(w, w, 0, size);
    ctx.quadraticCurveTo(-w, w, -size, 0);
    ctx.quadraticCurveTo(-w, -w, 0, -size);
    ctx.fill();

    // 中心の白いハイライト
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
