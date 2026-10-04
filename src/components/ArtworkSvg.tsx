import type { Ref, SVGProps } from 'react';
import { VB_H, VB_W, type Artwork } from '../data/artworks';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'strokeWidth'> {
  artwork: Artwork;
  /** true: 各 <path> がタッチを受け取る（塗り絵画面） / false: サムネイル */
  interactive?: boolean;
  strokeWidth?: number;
  ref?: Ref<SVGSVGElement>;
}

export const LINE_COLOR = '#2b2b35';

/**
 * 台紙（主線）SVGコンポーネント。
 * - 各パーツ（.coloring-part）は境界線が重ならない独立した閉じたパス。
 * - fill="transparent" かつ pointer-events="visiblePainted" により、
 *   ユーザーがタッチした座標で document.elementFromPoint() を使って最前面のパーツを1つだけ正確に特定可能。
 * - 目の表情や細かいディテール線は <g data-layer="lines"> に配置し pointer-events: none とすることで
 *   誤タッチやクリップの誤判定を完全に防ぐ。
 */
export function ArtworkSvg({ artwork, interactive = false, strokeWidth = 8, ref, ...rest }: Props) {
  return (
    <svg
      {...rest}
      ref={ref}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={artwork.title}
    >
      {/* 塗り領域（各パーツは絶対に重ならない独立閉パス） */}
      <g
        data-layer="parts"
        stroke={LINE_COLOR}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {artwork.parts.map((p) => (
          <path
            key={p.id}
            id={p.id}
            data-part={p.id}
            data-label={p.label || p.id}
            className="coloring-part"
            d={p.d}
            fill="transparent"
            pointerEvents={interactive ? 'visiblePainted' : 'none'}
            style={{ pointerEvents: interactive ? 'visiblePainted' : 'none' }}
          />
        ))}
      </g>

      {/* 装飾線・表情・主線ディテール（タッチを遮らない pointer-events: none） */}
      {artwork.lines && artwork.lines.length > 0 && (
        <g
          data-layer="lines"
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
          style={{ pointerEvents: 'none' }}
        >
          {artwork.lines.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}
    </svg>
  );
}
