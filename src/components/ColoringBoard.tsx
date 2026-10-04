import { useCallback, useEffect, useImperativeHandle, useRef, type PointerEvent as RPointerEvent, type Ref } from 'react';
import { VB_H, VB_W, type Artwork } from '../data/artworks';
import { PaintEngine, RES, type Brush, type Pt } from '../lib/paintEngine';
import { deletePainting, loadPainting, savePainting } from '../lib/storage';
import { ArtworkSvg } from './ArtworkSvg';

export interface BoardHandle {
  clear(): void;
  undo(): void;
  exportPng(): Promise<Blob>;
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
    const engine = new PaintEngine(canvasRef.current!);
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
   * pointerdown : タッチした <path> を取得し、クリップ開始
   * ================================================================ */
  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    const engine = engineRef.current;
    const svg = svgRef.current;
    if (!engine || !svg) return;
    if (activeRef.current) return; // 2本目以降の指（手のひら等）は無視

    const target = e.target;
    if (!(target instanceof SVGPathElement) || !target.dataset.part) return;
    const d = target.getAttribute('d');
    const ctm = svg.getScreenCTM();
    if (!d || !ctm) return;
    e.preventDefault();

    // 指が部位の外へ出ても pointermove を受け取り続ける
    svg.setPointerCapture(e.pointerId);

    // 各パーツは重ならない独立パスとして定義されているため、
    // タッチした d 属性がそのままクリッピングマスクになる
    const occluders: string[] = [];
    for (let el = target.nextElementSibling; el; el = el.nextElementSibling) {
      const od = el.getAttribute('d');
      if (od) occluders.push(od);
    }

    const toVB = ctm.inverse();
    activeRef.current = { pointerId: e.pointerId, partId: target.dataset.part, el: target, toVB };
    target.classList.add('is-active');

    engine.begin(d, occluders, project(toVB, e.clientX, e.clientY));
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
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);

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
        const W = VB_W * RES;
        const H = VB_H * RES;
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

        return new Promise<Blob>((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
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
