/**
 * お絵かき・塗り絵描画エンジン
 * --------------------------------------------------------------
 * ■ はみ出し防止（クリッピングマスク）
 *   ユーザーがタッチした座標 (clientX, clientY) から document.elementFromPoint() で
 *   最前面の <path class="coloring-part"> の d 属性を取得。
 *   new Path2D(d) を Canvas 2D コンテキストの ctx.clip() に渡すことで、
 *   黒い目安線の内側だけに描画領域を限定。
 *
 * ■ ペン種類
 *   - pen: なめらかな丸ペン
 *   - pattern: かわいいテクスチャ（水玉、星、ハート等）
 *   - sparkle: キラキラ（星マーク ★ や十字の光 ✦ が散らばる）
 *   - glitter: グリッター（ラメペンのような質感。高密度な光る微細粒子が密集）
 *   - spray: ふんわりエアブラシ
 *   - eraser: はみ出し防止の効いた消しゴム
 *
 * ■ ペンの太さ
 *   BASE_SIZE を「一番細い状態（最小値）」とし、Brush.sizeScale（1.0〜3.0）で拡大。
 */
import { VB_H, VB_W } from '../data/artworks';
import { PATTERNS, RAINBOW, getTileCanvas, shade, tint } from './palette';

export type ToolId = 'pen' | 'pattern' | 'sparkle' | 'glitter' | 'spray' | 'eraser';

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
  sparkle: 36,
  glitter: 32,
  sprayRadius: 46,
  eraser: 58,
} as const;

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
    // viewBox 座標 → Canvas 実ピクセル のスケーリング
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
      case 'sparkle':
        return BASE_SIZE.sparkle * s;
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
   * @param regionD      タッチされた最前面 <path> の d 属性（＝アクティブ領域）
   * @param ptOrArg      タッチ座標 Pt（または省略可能な引数）
   * @param excludeOrPt  除外パス配列 string[] または タッチ座標 Pt
   * @param excludePaths 除外パス配列 string[]（背景や入れ子図形の場合、内側領域をクリップから除外）
   */
  begin(regionD: string, ptOrArg?: unknown, excludeOrPt?: unknown, excludePaths?: string[]) {
    if (this.drawing) this.end();
    let p: Pt = { x: 0, y: 0 };
    let excludes: string[] = [];

    if (Array.isArray(excludePaths)) {
      excludes = excludePaths;
    } else if (Array.isArray(excludeOrPt)) {
      excludes = excludeOrPt;
    } else if (Array.isArray(ptOrArg)) {
      excludes = ptOrArg;
    }

    if (excludeOrPt && typeof excludeOrPt === 'object' && 'x' in excludeOrPt) {
      p = excludeOrPt as Pt;
    } else if (ptOrArg && typeof ptOrArg === 'object' && 'x' in ptOrArg) {
      p = ptOrArg as Pt;
    }

    const ctx = this.ctx;
    ctx.save();

    // 背景や「範囲の中の範囲（丸の中の丸など）」がある場合、
    // 外側パスから内側パスを除外した領域を evenodd で正確にクリッピング
    if (excludes.length > 0) {
      const clipPath = new Path2D();
      clipPath.addPath(this.path(regionD));
      for (const ep of excludes) {
        if (ep) clipPath.addPath(this.path(ep));
      }
      ctx.clip(clipPath, 'evenodd');
    } else {
      ctx.clip(this.path(regionD), 'evenodd');
    }

    this.applyStyle();
    this.drawing = true;
    this.last = p;
    this.cur = p;
    this.carry = 0;
    this.sparkles = [];
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
    this.drawing = false;
    this.last = null;
    this.cur = null;
    cancelAnimationFrame(this.raf);
    // 残っているパーティクルを最後まで描き切る
    for (const s of this.sparkles) {
      s.age = s.life;
      this.drawSparkle(s);
    }
    this.sparkles = [];
    // クリップを解除
    this.ctx.restore();
  }

  /* ================================================================
   * 履歴（Undo）管理用
   * ================================================================ */
  getImageData(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  putImageData(data: ImageData) {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.putImageData(data, 0, 0);
    this.ctx.restore();
    this.ctx.setTransform(RES, 0, 0, RES, 0, 0);
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.ctx.setTransform(RES, 0, 0, RES, 0, 0);
  }

  load(image: CanvasImageSource) {
    this.clear();
    this.ctx.drawImage(image, 0, 0, VB_W, VB_H);
  }

  toBlob(): Promise<Blob | null> {
    return new Promise((res) => this.canvas.toBlob(res, 'image/png'));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
  }

  /* ================================================================
   * 内部ロジック：描画スタイルの適用
   * ================================================================ */
  private path(d: string): Path2D {
    let p = this.pathCache.get(d);
    if (!p) {
      p = new Path2D(d);
      this.pathCache.set(d, p);
    }
    return p;
  }

  isPointIn(regionD: string, x: number, y: number): boolean {
    return this.ctx.isPointInPath(this.path(regionD), x * RES, y * RES, 'evenodd');
  }

  private pattern(id: string): CanvasPattern {
    let p = this.patternCache.get(id);
    if (!p) {
      const swatch = PATTERNS.find((item) => item.id === id) || PATTERNS[0];
      const tile = getTileCanvas(swatch);
      const created = this.ctx.createPattern(tile, 'repeat');
      if (!created) throw new Error('Pattern creation failed');
      p = created;
      this.patternCache.set(id, p);
    }
    return p;
  }

  private get isRainbow() {
    return this.brush.color === RAINBOW;
  }

  private nextColor(step = 2.5): string {
    if (!this.isRainbow) return this.brush.color;
    this.hue = (this.hue + step) % 360;
    return `hsl(${Math.round(this.hue)}, 95%, 55%)`;
  }

  private baseHex(): string {
    return this.brush.color === RAINBOW ? '#ffd700' : this.brush.color;
  }

  private applyStyle() {
    const ctx = this.ctx;
    const { tool } = this.brush;
    const lw = this.currentLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;
    // 消しゴム：Canvas 上の描画だけを透明に抜く（前面 SVG の主線は無関係）
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
      case 'sparkle':
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
      case 'sparkle': {
        const count = Math.round(6 * this.scale);
        for (let i = 0; i < count; i++) this.emitSparkle(p);
        this.speck(p);
        break;
      }
      case 'glitter': {
        this.stampGlitter(p);
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
      case 'sparkle': {
        // ★ キラキラ (Sparkle): 軌跡の周囲に、黄色や白の「星マーク（★）」や「十字の光」が散らばるエフェクト
        if (this.isRainbow) this.nextColor(4);
        const spacing = Math.max(8, 14 / this.scale);
        this.alongSegment(a, b, spacing, (p) => {
          this.emitSparkle(p);
          if (Math.random() < 0.6) this.emitSparkle(p);
          this.speck(p);
        });
        break;
      }
      case 'glitter': {
        // ★ グリッター (Glitter): ラメペンのような質感。高密度の光る粒子を密集させて描画
        this.drawGlitter(a, b);
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
      // キラキラ：指を止めている場所でも星が湧き出る
      if (tool === 'sparkle' && this.cur && Math.random() < 0.45) {
        this.emitSparkle(this.cur);
      }
      // グリッター：指を止めている場所でもラメが煌めく
      if (tool === 'glitter' && this.cur && Math.random() < 0.4) {
        this.stampGlitter(this.cur);
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

  /* ---------------- キラキラ（Sparkle）ペン ---------------- */
  private emitSparkle(p: Pt) {
    const base = this.baseHex();
    const spread = BASE_SIZE.sparkle * this.scale * 0.85;
    const ang = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.6) * spread;
    const roll = Math.random();

    let kind: Sparkle['kind'];
    if (roll < 0.45) kind = 'star4'; // 十字の光
    else if (roll < 0.75) kind = 'star5'; // 5芒星（★）
    else if (roll < 0.9) kind = 'dot';
    else kind = 'halo';

    // 黄色や白を主軸とした星マーク・十字の光パレット
    const palette = this.isRainbow
      ? [
          '#ffd700',
          '#ffffff',
          '#fff9c4',
          '#ffeb3b',
          `hsl(${Math.random() * 360},95%,65%)`,
        ]
      : [
          '#ffd700',
          '#ffeb3b',
          '#ffffff',
          '#ffffff',
          '#fff59d',
          tint(base, 0.6),
          tint(base, 0.3),
        ];

    const baseStarSize = (7 + Math.random() * 11) * Math.sqrt(this.scale);

    this.sparkles.push({
      x: p.x + Math.cos(ang) * r,
      y: p.y + Math.sin(ang) * r,
      size: kind === 'dot' ? (2.5 + Math.random() * 3.5) * Math.sqrt(this.scale) : baseStarSize,
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
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.92;
    const s = BASE_SIZE.sparkle * this.scale * 0.55;
    ctx.beginPath();
    ctx.arc(
      p.x + (Math.random() - 0.5) * s * 1.8,
      p.y + (Math.random() - 0.5) * s * 1.8,
      (1.0 + Math.random() * 1.6) * Math.sqrt(this.scale),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
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
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
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
      // 5方向の可愛い星型（★）
      ctx.fillStyle = s.color;
      ctx.beginPath();
      const R = size;
      const r = size * 0.44;
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? R : r;
        ctx.lineTo(rad * Math.cos(a), rad * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
      // 中心の白い光ハイライト
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // 4方向の十字の光（✦ ダイヤモンドクロス光）
    ctx.fillStyle = s.color;
    const w = size * 0.2;
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

  /* ---------------- グリッター（Glitter・ラメペン） ---------------- */
  /**
   * ラメペンのような質感。
   * 軌跡に沿って、非常に細かい高密度の光る粒子（ゴールド、シルバー、オーロラカラーなど）を
   * ランダムな透明度で密集させて描画し、金属的なザラザラした光沢感・ラメ感を表現する。
   */
  private drawGlitter(a: Pt, b: Pt) {
    const ctx = this.ctx;
    const base = this.baseHex();
    const s = this.scale;
    const lw = BASE_SIZE.glitter * s;
    const radius = lw * 0.55;

    // 1. ラメペンのゲルインク下地（半透明で滑らか）
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw * 0.85;
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = this.isRainbow ? this.nextColor(0.5) : base;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();

    // 2. 軌跡に沿って高密度のラメ粒子を密集させて描画
    const goldPalette = ['#ffd700', '#ffe082', '#ffc107', '#ffea00', '#d4af37', '#fff9c4'];
    const silverPalette = ['#ffffff', '#f8f9fa', '#eceff1', '#cfd8dc', '#b0bec5'];
    const auroraPalette = ['#ff80bf', '#80d8ff', '#a7ffeb', '#ea80fc', '#ffff8d', '#ffd180'];
    const colorPalette = this.isRainbow
      ? auroraPalette
      : [base, tint(base, 0.4), shade(base, 0.2), ...goldPalette.slice(0, 3)];

    const stepSpacing = Math.max(2.5, 4 / s);
    this.alongSegment(a, b, stepSpacing, (p) => {
      const count = Math.round(32 * Math.sqrt(s));
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * radius;
        const px = p.x + Math.cos(ang) * dist;
        const py = p.y + Math.sin(ang) * dist;

        const roll = Math.random();
        let pColor: string;
        if (roll < 0.35) {
          pColor = goldPalette[Math.floor(Math.random() * goldPalette.length)];
        } else if (roll < 0.7) {
          pColor = silverPalette[Math.floor(Math.random() * silverPalette.length)];
        } else {
          pColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        }

        const alpha = 0.4 + Math.random() * 0.6;
        const pSize = (0.7 + Math.random() * 1.6) * Math.sqrt(s);

        ctx.save();
        ctx.fillStyle = pColor;
        ctx.globalAlpha = alpha;

        // 30% の確率で微細なひし形・結晶フレークを描いてザラザラした光沢感を出す
        if (Math.random() < 0.3) {
          ctx.beginPath();
          ctx.moveTo(px, py - pSize * 1.3);
          ctx.lineTo(px + pSize * 0.8, py);
          ctx.lineTo(px, py + pSize * 1.3);
          ctx.lineTo(px - pSize * 0.8, py);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // 5% の確率で純白のキラリと光るキャッチライト（極小クロス光）
        if (Math.random() < 0.05) {
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.95;
          const glint = pSize * 1.8;
          ctx.fillRect(px - glint, py - 0.5, glint * 2, 1);
          ctx.fillRect(px - 0.5, py - glint, 1, glint * 2);
        }

        ctx.restore();
      }
    });
  }

  private stampGlitter(p: Pt) {
    const ctx = this.ctx;
    const base = this.baseHex();
    const s = this.scale;
    const radius = (BASE_SIZE.glitter * s) * 0.55;

    // 半透明下地
    ctx.save();
    ctx.fillStyle = this.isRainbow ? this.nextColor(0.5) : base;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const goldPalette = ['#ffd700', '#ffe082', '#ffc107', '#ffea00', '#d4af37'];
    const silverPalette = ['#ffffff', '#f8f9fa', '#eceff1'];
    const auroraPalette = ['#ff80bf', '#80d8ff', '#a7ffeb', '#ea80fc', '#ffd180'];
    const colorPalette = this.isRainbow ? auroraPalette : [base, tint(base, 0.4), ...goldPalette];

    const count = Math.round(28 * Math.sqrt(s));
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      const px = p.x + Math.cos(ang) * dist;
      const py = p.y + Math.sin(ang) * dist;

      const roll = Math.random();
      const pColor =
        roll < 0.35
          ? goldPalette[Math.floor(Math.random() * goldPalette.length)]
          : roll < 0.7
            ? silverPalette[Math.floor(Math.random() * silverPalette.length)]
            : colorPalette[Math.floor(Math.random() * colorPalette.length)];

      const alpha = 0.4 + Math.random() * 0.6;
      const pSize = (0.8 + Math.random() * 1.5) * Math.sqrt(s);

      ctx.save();
      ctx.fillStyle = pColor;
      ctx.globalAlpha = alpha;

      if (Math.random() < 0.3) {
        ctx.beginPath();
        ctx.moveTo(px, py - pSize * 1.3);
        ctx.lineTo(px + pSize * 0.8, py);
        ctx.lineTo(px, py + pSize * 1.3);
        ctx.lineTo(px - pSize * 0.8, py);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
