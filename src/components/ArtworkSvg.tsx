import type { Ref, SVGProps } from 'react';
import { VB_H, VB_W, type Artwork } from '../data/artworks';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'strokeWidth'> {
  artwork: Artwork;
  /** true: 各 <path> がタッチを受け取る（塗り絵画面） / false: サムネイル */
  interactive?: boolean;
  strokeWidth?: number;
  ref?: Ref<SVGSVGElement>;
}

/**
 * 台紙（主線）インラインSVGコンポーネント。
 * - 各パーツ（.coloring-part）は境界線が重ならない独立した閉じたパス。
 * - fill="none" により、下の Canvas 描画を絶対に隠さない。
 * - stroke="black" かつ stroke-width="5"（3以上の太さ）で、太い黒枠線がはっきりと見える。
 * - pointer-events="all" により、透明な塗り領域でも指やペンのタッチ判定を確実にキャッチ。
 * - 表情やディテール線は <g class="coloring-lines"> に配置し pointer-events: none とすることで
 *   線画による誤判定を防ぐ。
 */
export function ArtworkSvg({
  artwork,
  interactive = false,
  strokeWidth = 5,
  ref,
  className,
  ...rest
}: Props) {
  const pe = interactive ? 'all' : 'none';

  return (
    <svg
      {...rest}
      ref={ref}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={artwork.title}
      style={{
        pointerEvents: interactive ? 'auto' : 'none',
        display: 'block',
        width: '100%',
        height: '100%',
        ...rest.style,
      }}
    >
      {/* 塗り領域パーツ群（太線黒枠・fill:transparent・pointer-events:all） */}
      <g
        className="coloring-parts"
        fill="transparent"
        stroke="black"
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
            stroke="black"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            pointerEvents={pe}
            style={{
              pointerEvents: pe,
              fill: 'transparent',
              stroke: 'black',
              strokeWidth: `${strokeWidth}px`,
            }}
          />
        ))}
      </g>

      {/* 表情・主線ディテール（pointer-events: none でタッチを遮らない） */}
      {artwork.lines && artwork.lines.length > 0 && (
        <g
          className="coloring-lines"
          fill="none"
          stroke="black"
          strokeWidth={strokeWidth + 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
          style={{
            pointerEvents: 'none',
            fill: 'none',
            stroke: 'black',
            strokeWidth: `${strokeWidth + 1}px`,
          }}
        >
          {artwork.lines.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}
    </svg>
  );
}
