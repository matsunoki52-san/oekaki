import type { Ref, SVGProps } from 'react';
import { BG_PART, VB_H, VB_W, type Artwork } from '../data/artworks';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'strokeWidth'> {
  artwork: Artwork;
  /** true: 各 <path> がタッチを受け取る（塗り絵画面） / false: サムネイル */
  interactive?: boolean;
  strokeWidth?: number;
  ref?: Ref<SVGSVGElement>;
}

export const LINE_COLOR = '#2b2b35';

/**
 * 台紙（主線）SVG。
 * - 部位は <g data-layer="parts"> 内に z-order 順で並ぶ。
 *   → DOM 上の「後ろの兄弟要素」= 手前に重なる部位、として clip 計算に使う。
 * - PNG 書き出し時にそのままシリアライズできるよう、見た目は CSS ではなく属性で指定する。
 */
export function ArtworkSvg({ artwork, interactive = false, strokeWidth = 7, ref, ...rest }: Props) {
  const pe = interactive ? 'auto' : 'none';
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
      <g
        data-layer="parts"
        fill="transparent"
        stroke={LINE_COLOR}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* 背景（台紙全体）。最背面なので、全部位が「手前の部位」として除外される */}
        <path data-part={BG_PART.id} d={BG_PART.d} stroke="none" style={{ pointerEvents: pe }} />
        {artwork.parts.map((p) => (
          <path key={p.id} data-part={p.id} d={p.d} style={{ pointerEvents: pe }} />
        ))}
      </g>
      {artwork.lines && (
        <g
          data-layer="lines"
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
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
