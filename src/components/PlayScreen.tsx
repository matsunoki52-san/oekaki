import { useEffect, useMemo, useRef, useState } from 'react';
import type { Artwork } from '../data/artworks';
import type { Brush, ToolId } from '../lib/paintEngine';
import { COLORS, PATTERNS, RAINBOW, getTileDataUrl } from '../lib/palette';
import { sfx } from '../lib/sound';
import { ColoringBoard, type BoardHandle } from './ColoringBoard';
import {
  BackIcon,
  CameraIcon,
  CheckIcon,
  CrossIcon,
  EraserIcon,
  GlitterIcon,
  PatternIcon,
  PenIcon,
  SprayIcon,
  TrashIcon,
  UndoIcon,
} from './Icons';

interface Props {
  artwork: Artwork;
  onBack: () => void;
}

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'pen', label: 'ペン' },
  { id: 'pattern', label: 'もよう' },
  { id: 'glitter', label: 'キラキラ' },
  { id: 'spray', label: 'スプレー' },
  { id: 'eraser', label: 'けしゴム' },
];

export function PlayScreen({ artwork, onBack }: Props) {
  const boardRef = useRef<BoardHandle>(null);
  const [tool, setTool] = useState<ToolId>('pen');
  const [color, setColor] = useState(COLORS[1].value);
  const [patternId, setPatternId] = useState(PATTERNS[0].id);
  const [brushScale, setBrushScale] = useState(1.0); // 1.0 (最小・標準) 〜 3.0 (太い)
  const [canUndo, setCanUndo] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saved, setSaved] = useState<{ url: string; blob: Blob } | null>(null);
  const [saving, setSaving] = useState(false);

  const brush = useMemo<Brush>(
    () => ({ tool, color, patternId, sizeScale: brushScale }),
    [tool, color, patternId, brushScale],
  );
  const pattern = PATTERNS.find((p) => p.id === patternId)!;

  useEffect(() => () => {
    if (saved) URL.revokeObjectURL(saved.url);
  }, [saved]);

  const pickTool = (t: ToolId) => {
    sfx.select();
    setTool(t);
  };

  const doUndo = () => {
    if (!canUndo) return;
    sfx.pop();
    boardRef.current?.undo();
  };

  const doClear = () => {
    boardRef.current?.clear();
    sfx.clear();
    setConfirmClear(false);
  };

  /** PNG 保存：共有シート（写真に保存）→ 非対応ならダウンロード */
  const doSave = async () => {
    if (!boardRef.current || saving) return;
    setSaving(true);
    try {
      const blob = await boardRef.current.exportPng();
      const name = `nurie-${artwork.id}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      sfx.save();
      setSaved({ url: URL.createObjectURL(blob), blob });

      let shared = false;
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'ぬりえ' });
          shared = true;
        } catch (err) {
          if ((err as DOMException).name === 'AbortError') shared = true; // キャンセルは何もしない
        }
      }
      if (!shared) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="play">
      <header className="play__top">
        <div className="play__top-left">
          <button
            id="btn-play-back"
            className="chip-btn chip-btn--round"
            aria-label="もどる"
            onClick={() => {
              sfx.back();
              onBack();
            }}
          >
            <BackIcon />
          </button>
          <button
            id="btn-play-undo"
            className={`chip-btn chip-btn--round chip-btn--undo ${!canUndo ? 'is-disabled' : ''}`}
            aria-label="ひとつもどる"
            disabled={!canUndo}
            onClick={doUndo}
          >
            <UndoIcon />
          </button>
        </div>

        <h1 className="play__title">{artwork.title}</h1>

        <button id="btn-save" className="chip-btn chip-btn--save" aria-label="ほぞん" onClick={doSave} disabled={saving}>
          <span className="chip-btn__icon">
            <CameraIcon />
          </span>
          <span className="chip-btn__text">ほぞん</span>
        </button>
      </header>

      <div className="play__main">
        {/* ツールバーとペンの太さスライダー */}
        <div className="tools-pane">
          {/* ペンの太さスライダー（ツールのすぐ上） */}
          <div className="brush-size-card" aria-label="ペンのふとさ">
            <div className="brush-size-top">
              <span className="brush-size-label">ふとさ</span>
              <div className="brush-size-preview-wrap">
                <span
                  className="brush-size-preview"
                  style={{
                    width: `${Math.round(14 * brushScale)}px`,
                    height: `${Math.round(14 * brushScale)}px`,
                    background:
                      tool === 'eraser'
                        ? '#ff9ec4'
                        : color === RAINBOW
                        ? 'conic-gradient(#ff3b3b,#ff9f1c,#ffe94e,#5ed16a,#4cc3ff,#8b5cf6,#ff3b3b)'
                        : color,
                  }}
                />
              </div>
            </div>
            <div className="brush-size-slider-row">
              <span className="size-hint size-hint--sm" aria-hidden="true" />
              <input
                id="brush-size-slider"
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={brushScale}
                onChange={(e) => setBrushScale(parseFloat(e.target.value))}
                aria-label="ペンの太さスライダー"
              />
              <span className="size-hint size-hint--lg" aria-hidden="true" />
            </div>
          </div>

          <nav className="tools" aria-label="どうぐ">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                id={`tool-${t.id}`}
                className={`tool ${tool === t.id ? 'is-selected' : ''}`}
                aria-pressed={tool === t.id}
                aria-label={t.label}
                onClick={() => pickTool(t.id)}
              >
                <span className="tool__icon">
                  {t.id === 'pen' && <PenIcon color={color} />}
                  {t.id === 'pattern' && <PatternIcon tileUrl={getTileDataUrl(pattern)} />}
                  {t.id === 'glitter' && <GlitterIcon color={color} />}
                  {t.id === 'spray' && <SprayIcon color={color} />}
                  {t.id === 'eraser' && <EraserIcon />}
                </span>
                <span className="tool__label">{t.label}</span>
              </button>
            ))}
            <span className="tools__sep" />
            <button
              id="tool-clear"
              className="tool tool--danger"
              aria-label="ぜんぶけす"
              onClick={() => {
                sfx.pop();
                setConfirmClear(true);
              }}
            >
              <span className="tool__icon">
                <TrashIcon />
              </span>
              <span className="tool__label">ぜんぶけす</span>
            </button>
          </nav>
        </div>

        <div className="stage">
          <div className="paper">
            <ColoringBoard ref={boardRef} artwork={artwork} brush={brush} onUndoChange={setCanUndo} />
          </div>
        </div>
      </div>

      <Palette tool={tool} color={color} patternId={patternId} onColor={setColor} onPattern={setPatternId} />

      {confirmClear && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="ぜんぶけしますか？">
          <div className="dialog pop-in">
            <div className="dialog__art">
              <TrashIcon />
            </div>
            <p className="dialog__text">ぜんぶ けす？</p>
            <div className="dialog__actions">
              <button id="btn-clear-no" className="big-round big-round--no" aria-label="やめる" onClick={() => setConfirmClear(false)}>
                <CrossIcon />
              </button>
              <button id="btn-clear-yes" className="big-round big-round--yes" aria-label="けす" onClick={doClear}>
                <CheckIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="ほぞんしたよ" onClick={() => setSaved(null)}>
          <Confetti />
          <div className="dialog dialog--saved pop-in" onClick={(e) => e.stopPropagation()}>
            <p className="dialog__text">できたね！</p>
            <img className="saved-preview" src={saved.url} alt="ぬったえ" />
            <p className="dialog__hint">※ ほぞんできなかったときは、えを ながおし してね</p>
            <button id="btn-saved-ok" className="big-round big-round--yes" aria-label="とじる" onClick={() => setSaved(null)}>
              <CheckIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- パレット（横スクロール） ---------------- */
interface PaletteProps {
  tool: ToolId;
  color: string;
  patternId: string;
  onColor: (c: string) => void;
  onPattern: (id: string) => void;
}

function Palette({ tool, color, patternId, onColor, onPattern }: PaletteProps) {
  const ref = useRef<HTMLDivElement>(null);

  // 選択中のスウォッチを見える位置へ
  useEffect(() => {
    ref.current?.querySelector('.swatch.is-selected')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [tool, color, patternId]);

  if (tool === 'eraser') {
    return (
      <footer className="palette palette--msg">
        <div className="eraser-hint">
          <span className="eraser-hint__icon">
            <EraserIcon />
          </span>
          ゆびで こすって けしてね
        </div>
      </footer>
    );
  }

  return (
    <footer className="palette" aria-label="いろ">
      <div className="palette__scroll" ref={ref}>
        {tool === 'pattern'
          ? PATTERNS.map((p) => (
              <button
                key={p.id}
                id={`swatch-${p.id}`}
                className={`swatch ${p.id === patternId ? 'is-selected' : ''}`}
                style={{ backgroundImage: `url(${getTileDataUrl(p)})`, backgroundSize: '32px 32px' }}
                aria-label={`もよう ${p.type}`}
                onClick={() => {
                  sfx.pop();
                  onPattern(p.id);
                }}
              />
            ))
          : COLORS.map((c) => (
              <button
                key={c.id}
                id={`swatch-${c.id}`}
                className={`swatch ${c.value === color ? 'is-selected' : ''} ${c.value === RAINBOW ? 'swatch--rainbow' : ''} ${
                  tool === 'glitter' ? 'swatch--glitter' : ''
                }`}
                style={c.value === RAINBOW ? undefined : { background: c.value }}
                aria-label={c.name}
                onClick={() => {
                  sfx.pop();
                  onColor(c.value);
                }}
              />
            ))}
      </div>
    </footer>
  );
}

/* ---------------- 紙吹雪 ---------------- */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.8 + Math.random() * 1.4,
        color: COLORS[1 + (i % (COLORS.length - 4))].value,
        rot: Math.random() * 360,
        size: 10 + Math.random() * 10,
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size * 0.6,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
