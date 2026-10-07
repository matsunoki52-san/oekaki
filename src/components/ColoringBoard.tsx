import { useCallback, useEffect, useImperativeHandle, useRef, type PointerEvent as RPointerEvent, type Ref } from 'react';
import { type Artwork } from '../data/artworks';
import { PaintEngine, RES, type Brush, type Pt } from '../lib/paintEngine';
import { deletePainting, loadPainting, savePainting } from '../lib/storage';
import { startDrawSfx, stopDrawSfx } from '../lib/sound';
import { ArtworkSvg } from './ArtworkSvg';

export interface BoardHandle {
  clear(): void;
  undo(): void;
  /** Canvas(色) + SVG(主線) を合成した PNG の data URL */
  exportPng(): Promise<string>;
}

interface Props {
  artwork: Artwork;
  brush: Brush;
  onStrokeStart?: () => void;
  onUndoChange?: (canUndo: boolean) => void;
  ref?: Ref<BoardHandle>;
}

/** 現在のアクティブ領域（タッチ開始時に確定し、終了時にリセット） */
interface ActiveRegion {
  pointerId: number;
  partId: string;
  el: SVGPathElement;
  /** 画面座標 → viewBox 座標 の変換行列（ストローク中は固定） */
  toVB: DOMMatrix;
}

const MAX_HISTORY = 20;

/**
 * 塗り絵ボード
 *  レイヤー1（背面）: <canvas>  … 塗った色
 *  レイヤー2（前面）: <svg>     … 主線。タッチイベントはここで受ける
 * 各パーツの境界線は重ならず、タッチした部位の内側だけにクリッピングマスクが適用される。
 */
export function ColoringBoard({ artwork, brush, onStrokeStart, onUndoChange, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const engineRef = useRef<PaintEngine | null>(null);
  const activeRef = useRef<ActiveRegion | null>(null);
  const saveTimer = useRef<number>(0);
  const historyRef = useRef<ImageData[]>([]);

  const pushSnapshot = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const snap = engine.getImageData();
    historyRef.current.push(snap);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    onUndoChange?.(historyRef.current.length > 1);
  }, [onUndoChange]);

  /* ---- エンジン初期化 & 保存済みの絵を復元 ---- */
  useEffect(() => {
    const engine = new PaintEngine(canvasRef.current!, artwork.width, artwork.height);
    engineRef.current = engine;
    historyRef.current = [];
    onUndoChange?.(false);

    let cancelled = false;
    loadPainting(artwork.id).then(async (blob) => {
      if (cancelled) return;
      if (blob) {
        const bmp = await createImageBitmap(blob).catch(() => null);
        if (bmp && !cancelled && !engine.isDrawing) {
          engine.load(bmp);
        }
      }
      if (!cancelled) {
        // 初期状態を履歴の先頭に保存
        pushSnapshot();
      }
    });

    return () => {
      cancelled = true;
      engine.end();
      engine.dispose();
      engineRef.current = null;
    };
  }, [artwork.id, pushSnapshot, onUndoChange]);

  useEffect(() => {
    engineRef.current?.setBrush(brush);
  }, [brush]);

  /* ---- 自動保存（描き終わって少ししたら IndexedDB へ） ---- */
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const blob = await engineRef.current?.toBlob();
      if (blob) await savePainting(artwork.id, blob);
    }, 700);
  }, [artwork.id]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  /* ---- 画面座標 → viewBox 座標 ---- */
  const project = (m: DOMMatrix, clientX: number, clientY: number): Pt => {
    const p = new DOMPoint(clientX, clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  };

  /* ================================================================
   * pointerdown : タッチした座標から最前面の <path> を特定し、Path2D でクリップ開始
   * ================================================================ */
  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    const engine = engineRef.current;
    const svg = svgRef.current;
    if (!engine || !svg) return;
    if (activeRef.current) return; // 2本目以降の指（手のひら等）は無視

    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const toVB = ctm.inverse();
    const pt = project(toVB, e.clientX, e.clientY);

    interface PartInfo {
      el: SVGPathElement;
      d: string;
      bbox: DOMRect;
      area: number;
    }

    const allParts = Array.from(svg.querySelectorAll<SVGPathElement>('.coloring-part'));
    const nonBgParts = allParts.filter((p) => p.id !== 'bg' && p.dataset.part !== 'bg');

    const partInfos: PartInfo[] = nonBgParts.map((p) => {
      let bbox: DOMRect;
      try {
        bbox = p.getBBox();
      } catch {
        bbox = new DOMRect(0, 0, 1, 1);
      }
      return {
        el: p,
        d: p.getAttribute('d') || '',
        bbox,
        area: bbox.width * bbox.height,
      };
    });

    // パーツの包含判定（child が parent の内側に完全に収まっているか）
    const isContained = (child: PartInfo, parent: PartInfo): boolean => {
      if (child === parent) return false;
      if (child.area >= parent.area * 0.98) return false;
      const cb = child.bbox;
      const pb = parent.bbox;
      if (
        cb.x < pb.x - 3 ||
        cb.y < pb.y - 3 ||
        cb.x + cb.width > pb.x + pb.width + 3 ||
        cb.y + cb.height > pb.y + pb.height + 3
      ) {
        return false;
      }
      const cx = cb.x + cb.width / 2;
      const cy = cb.y + cb.height / 2;
      return engine.isPointIn(parent.d, cx, cy);
    };

    // 1. タッチ座標 pt を含むパーツを検出
    let containingParts = partInfos.filter((p) => p.d && engine.isPointIn(p.d, pt.x, pt.y));

    // 境界線（黒線）の真上などで直接ヒットしなかった場合、周囲8px以内から近接パーツを探索（3歳児の太い指への配慮）
    if (containingParts.length === 0) {
      for (let r = 2; r <= 8; r += 2) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const sx = pt.x + Math.cos(angle) * r;
          const sy = pt.y + Math.sin(angle) * r;
          const nearParts = partInfos.filter((p) => p.d && engine.isPointIn(p.d, sx, sy));
          if (nearParts.length > 0) {
            containingParts = nearParts;
            break;
          }
        }
        if (containingParts.length > 0) break;
      }
    }

    let targetPartInfo: PartInfo | null = null;
    if (containingParts.length > 0) {
      // 複数マッチした場合は最も内側（面積が最も小さい）パーツを選択（例：顔の中の目、目の中の瞳、タイヤの中のホイール）
      containingParts.sort((a, b) => a.area - b.area);
      targetPartInfo = containingParts[0];
    } else {
      // isPointIn で境界線上等により拾えなかった場合のフォールバック (elementFromPoint)
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el instanceof SVGPathElement && (el.classList.contains('coloring-part') || el.dataset.part)) {
        if (el.id !== 'bg' && !el.id.startsWith('bg-') && el.dataset.part !== 'bg') {
          targetPartInfo = partInfos.find((pi) => pi.el === el) || null;
        }
      } else if (e.target instanceof SVGPathElement && (e.target.classList.contains('coloring-part') || e.target.dataset.part)) {
        if (e.target.id !== 'bg' && !e.target.id.startsWith('bg-') && e.target.dataset.part !== 'bg') {
          targetPartInfo = partInfos.find((pi) => pi.el === e.target) || null;
        }
      }
    }

    // ★ 要件1: 背景領域も全て塗れるように対応
    // キャラクターや地面にヒットしなかった場合は「背景（bg または bg-*）」をターゲットとする
    const isBg = !targetPartInfo;
    let targetPath: SVGPathElement | null = null;
    if (targetPartInfo) {
      targetPath = targetPartInfo.el;
    } else {
      const bgParts = allParts.filter(
        (p) => p.id === 'bg' || p.id.startsWith('bg-') || p.classList.contains('coloring-part--bg'),
      );
      targetPath =
        bgParts.find((p) => {
          const pD = p.getAttribute('d');
          return pD && engine.isPointIn(pD, pt.x, pt.y);
        }) ||
        bgParts[0] ||
        svg.querySelector<SVGPathElement>('#bg');
    }

    const d = targetPath?.getAttribute('d') || `M0 0H${artwork.width}V${artwork.height}H0Z`;
    e.preventDefault();

    // ★ 要件2: 「範囲の中の範囲（丸の中の丸など）」のはみ出し防止ロジック
    // Potrace生成パスは自前で穴（evenoddサブパス）として保持しているため excludePaths は不要。
    // ArtworkSvg.tsx が強制追加する単純矩形背景（穴なし）の場合のみ excludePaths を計算して付与する。
    const isManualBg = isBg && targetPath?.id === 'bg' && (d.startsWith('M0 0H') || d.startsWith('M 0 0H'));
    const excludePaths: string[] = [];

    if (isManualBg) {
      const topLevelParts = partInfos.filter((p) => !partInfos.some((other) => isContained(p, other)));
      for (const p of topLevelParts) {
        if (p.d) excludePaths.push(p.d);
      }
    }

    // 指が部位の外へ出ても pointermove を受け取り続ける
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {}

    activeRef.current = {
      pointerId: e.pointerId,
      partId: targetPath ? targetPath.dataset.part || targetPath.id : 'bg',
      el: targetPath!,
      toVB,
    };
    targetPath?.classList.add('is-active');

    // 取得した d 属性および除外パス（内側範囲・キャラクター）を渡してクリッピング開始
    engine.begin(d, pt, excludePaths);
    startDrawSfx(brush.id);
    onStrokeStart?.();
  };

  /* ================================================================
   * pointermove : clip が効いたまま描画
   * ================================================================ */
  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    const a = activeRef.current;
    const engine = engineRef.current;
    if (!a || !engine || e.pointerId !== a.pointerId) return;
    const native = e.nativeEvent;
    // Apple Pencil / 高速なぞりでも滑らかに（対応ブラウザのみ）
    const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    if (events.length) for (const ev of events) engine.move(project(a.toVB, ev.clientX, ev.clientY));
    else engine.move(project(a.toVB, e.clientX, e.clientY));
  };

  /* ================================================================
   * pointerup / cancel : restore してアクティブ領域をリセット
   * 1ストローク完了ごとに履歴へ保存
   * ================================================================ */
  const finish = (e: RPointerEvent<SVGSVGElement>) => {
    const a = activeRef.current;
    if (!a || e.pointerId !== a.pointerId) return;
    engineRef.current?.end();
    a.el.classList.remove('is-active');
    activeRef.current = null;
    try {
      if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    } catch {}

    stopDrawSfx();

    // ★ 1アクションとして履歴に保存
    pushSnapshot();
    scheduleSave();
  };

  /* ---- 親コンポーネント向け API (Clear / Undo / Export) ---- */
  useImperativeHandle(
    ref,
    () => ({
      clear() {
        engineRef.current?.clear();
        clearTimeout(saveTimer.current);
        void deletePainting(artwork.id);
        pushSnapshot();
      },
      undo() {
        const engine = engineRef.current;
        if (!engine || historyRef.current.length <= 1) return;
        // 最新の現在状態を捨てる
        historyRef.current.pop();
        // 1つ前の状態を復元
        const prev = historyRef.current[historyRef.current.length - 1];
        if (prev) {
          engine.putImageData(prev);
          onUndoChange?.(historyRef.current.length > 1);
          scheduleSave();
        }
      },
      /** Canvas(色) と SVG(主線) を合成して PNG 化 */
      async exportPng() {
        const engine = engineRef.current!;
        const svg = svgRef.current!;
        const W = artwork.width * RES;
        const H = artwork.height * RES;
        const out = document.createElement('canvas');
        out.width = W;
        out.height = H;
        const o = out.getContext('2d')!;
        o.fillStyle = '#ffffff';
        o.fillRect(0, 0, W, H);
        o.drawImage(engine.canvas, 0, 0, W, H);

        const clone = svg.cloneNode(true) as SVGSVGElement;
        clone.setAttribute('width', String(W));
        clone.setAttribute('height', String(H));
        clone.removeAttribute('class');
        const xml = new XMLSerializer().serializeToString(clone);
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
        await img.decode();
        o.drawImage(img, 0, 0, W, H);

        return out.toDataURL('image/png');
      },
    }),
    [artwork.id, pushSnapshot, onUndoChange, scheduleSave],
  );

  return (
    <div className="board">
      <canvas ref={canvasRef} className="board__canvas" aria-hidden="true" />
      <ArtworkSvg
        ref={svgRef}
        artwork={artwork}
        interactive
        className="board__svg"
        // Pointer Events はマウス/タッチ/Apple Pencil 共通
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      />
    </div>
  );
}
