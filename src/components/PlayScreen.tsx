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
  NeonIcon,
  PatternIcon,
  PenIcon,
  SparkleIcon,
  StampIcon,
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
  { id: 'neon', label: 'ネオン' },
  { id: 'pattern', label: 'もよう' },
  { id: 'stamp', label: 'スタンプ' },
  { id: 'sparkle', label: 'キラキラ' },
  { id: 'glitter', label: 'グリッター' },
  { id: 'spray', label: 'スプレー' },
  { id: 'eraser', label: 'けしゴム' },
];

export function PlayScreen({ artwork, onBack }: Props) {
  const boardRef = useRef<BoardHandle>(null);
  const [tool, setTool] = useState<ToolId>('pen');
  const [color, setColor] = useState(COLORS[1].value);
  const [patternId, setPatternId] = useState(PATTERNS[0].id);
  const [brushSlider, setBrushSlider] = useState(50); // 0(細) 〜 50(標準=1.0) 〜 100(太=3.0)
  const [canUndo, setCanUndo] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saved, setSaved] = useState<{ url: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const brushScale = useMemo(() => {
    if (brushSlider <= 50) {
      return 0.3 + (brushSlider / 50) * 0.7; // 0.3 〜 1.0
    } else {
      return 1.0 + ((brushSlider - 50) / 50) * 2.0; // 1.0 〜 3.0
    }
  }, [brushSlider]);

  const brush = useMemo<Brush>(
    () => ({ tool, color, patternId, sizeScale: brushScale }),
    [tool, color, patternId, brushScale],
  );
  const pattern = PATTERNS.find((p) => p.id === patternId)!;


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

  /** PNG 保存（ワンタップ）: toDataURL → <a download> を自動クリック */
  const doSave = async () => {
    if (!boardRef.current || saving) return;
    setSaving(true);
    try {
      const dataUrl = await boardRef.current.exportPng();
      
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'nurie.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'わたしのぬりえ',
          });
          sfx.save();
          setSaved({ url: dataUrl });
          return;
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Share failed:', err);
        } else if (err instanceof Error && err.name === 'AbortError') {
          return; // ユーザーがキャンセルした場合は何もしない
        }
      }

      // フォールバック: aタグによるダウンロード
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'nurie.png';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      sfx.save();
      setSaved({ url: dataUrl });
    } finally {
      setSaving(false);
    }
  };

  const renderBrushSizeCard = (className: string) => (
    <div className={`brush-size-card ${className}`} aria-label="ペンのふとさ">
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
          type="range"
          min="0"
          max="100"
          step="1"
          value={brushSlider}
          onChange={(e) => setBrushSlider(parseInt(e.target.value, 10))}
          aria-label="ペンの太さスライダー"
        />
        <span className="size-hint size-hint--lg" aria-hidden="true" />
      </div>
    </div>
  );

  return (
    <div className="play">
      <header className="play__top">
        <div className="play__top-left">
          <button
            className="chip-btn chip-btn--round chip-btn--back"
            aria-label="もどる"
            onClick={() => {
              sfx.back();
              onBack();
            }}
          >
            <BackIcon />
          </button>
          <button
            className={`chip-btn chip-btn--round chip-btn--undo ${!canUndo ? 'is-disabled' : ''}`}
            aria-label="ひとつもどる"
            disabled={!canUndo}
            onClick={doUndo}
          >
            <UndoIcon />
          </button>

          {renderBrushSizeCard('brush-size-card--desktop')}

          <button className="chip-btn chip-btn--save chip-btn--save-desktop" aria-label="ほぞん" onClick={doSave} disabled={saving}>
            <span className="chip-btn__icon">
              <CameraIcon />
            </span>
            <span className="chip-btn__text">ほぞん</span>
          </button>
        </div>

        <h1 className="play__title">{artwork.title}</h1>

        <div className="play__top-right">
          <button className="chip-btn chip-btn--save chip-btn--save-mobile" aria-label="ほぞん" onClick={doSave} disabled={saving}>
            <span className="chip-btn__icon">
              <CameraIcon />
            </span>
            <span className="chip-btn__text">ほぞん</span>
          </button>
        </div>
      </header>

      <div className="play__main">
        <div className="stage">
          <div
            className="paper"
            style={{
              aspectRatio: `${artwork.width} / ${artwork.height}`,
              width: `min(100cqw, 100cqh * ${artwork.width} / ${artwork.height})`,
            }}
          >
            <ColoringBoard ref={boardRef} artwork={artwork} brush={brush} onUndoChange={setCanUndo} />
          </div>
        </div>
      </div>

      <div className="play__bottom">
        {renderBrushSizeCard('brush-size-card--mobile')}

        <div className="play__bottom-tools-row">
          <nav className="tools" aria-label="どうぐ">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                className={`tool ${tool === t.id ? 'is-selected' : ''}`}
                aria-pressed={tool === t.id}
                aria-label={t.label}
                onClick={() => pickTool(t.id)}
              >
                <span className="tool__icon">
                  {t.id === 'pen' && <PenIcon color={color} />}
                  {t.id === 'neon' && <NeonIcon color={color} />}
                  {t.id === 'pattern' && <PatternIcon tileUrl={getTileDataUrl(pattern)} />}
                  {t.id === 'stamp' && <StampIcon color={color} />}
                  {t.id === 'sparkle' && <SparkleIcon color={color} />}
                  {t.id === 'glitter' && <GlitterIcon color={color} />}
                  {t.id === 'spray' && <SprayIcon color={color} />}
                  {t.id === 'eraser' && <EraserIcon />}
                </span>
                <span className="tool__label">{t.label}</span>
              </button>
            ))}
            <span className="tools__sep" />
            <button
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

        <Palette tool={tool} color={color} patternId={patternId} onColor={setColor} onPattern={setPatternId} />
      </div>

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
    const container = ref.current;
    const selected = container?.querySelector('.swatch.is-selected') as HTMLElement;
    if (container && selected) {
      const left = selected.offsetLeft - (container.clientWidth / 2) + (selected.clientWidth / 2);
      container.scrollTo({ left, behavior: 'smooth' });
    }
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
                  tool === 'glitter' ? 'swatch--glitter' : tool === 'sparkle' ? 'swatch--sparkle' : ''
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
