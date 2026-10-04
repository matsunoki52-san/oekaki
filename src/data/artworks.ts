/**
 * 台紙データ (ローカルの SVG/*.svg から直接読み込み・パース)
 * --------------------------------------------------------------
 * プロジェクト内の SVG フォルダに格納されている80種のSVGファイル群を
 * import.meta.glob で参照し、アプリの台紙データとして読み込みます。
 */

export type GenreId = 'animals' | 'vehicles' | 'characters' | 'food';

export interface Part {
  id: string;
  d: string;
  label?: string;
}

export interface Artwork {
  id: string;
  genre: GenreId;
  title: string;
  parts: Part[];
  lines?: string[];
  rawSvg: string;
}

export interface Genre {
  id: GenreId;
  title: string;
  emoji: string;
  color: string;
  shadow: string;
}

export const VB_W = 1024;
export const VB_H = 768;

export const GENRES: Genre[] = [
  { id: 'animals', title: 'どうぶつ', emoji: '🦁', color: '#ffb547', shadow: '#e08a12' },
  { id: 'vehicles', title: 'のりもの', emoji: '🚗', color: '#5ec8ff', shadow: '#2a97d6' },
  { id: 'characters', title: 'キャラクター', emoji: '✨', color: '#c58cff', shadow: '#9256d9' },
  { id: 'food', title: 'たべもの', emoji: '🍰', color: '#ff7fa8', shadow: '#dc4b7c' },
];

// SVGフォルダ内のSVGファイルをraw文字列として直接インポート
const rawSvgModules = import.meta.glob<string>('../../SVG/*.svg', {
  query: '?raw',
  eager: true,
  import: 'default',
});

function parseSvgArtwork(filename: string, rawSvg: string): Artwork {
  const baseName = filename.split('/').pop() || filename;

  // <title> タグからタイトル取得
  const titleMatch = rawSvg.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1] : baseName.replace(/\.svg$/, '');

  // ファイル名からジャンル判定
  let genre: GenreId = 'animals';
  if (baseName.startsWith('Characters_')) genre = 'characters';
  else if (baseName.startsWith('Vehicles_')) genre = 'vehicles';
  else if (baseName.startsWith('Food_')) genre = 'food';

  const id = baseName.replace(/\.svg$/, '').toLowerCase().replace(/_/g, '-');

  // <path ... class="coloring-part" ...> からパーツ情報を抽出
  const parts: Part[] = [];
  const partRegex = /<path[^>]*class="[^"]*coloring-part[^"]*"[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = partRegex.exec(rawSvg)) !== null) {
    const tag = match[0];
    const idMatch = tag.match(/id="([^"]+)"/) || tag.match(/data-part="([^"]+)"/);
    const dMatch = tag.match(/d="([^"]+)"/);
    const labelMatch = tag.match(/data-label="([^"]+)"/);
    if (dMatch) {
      const pid = idMatch ? idMatch[1] : `part-${parts.length}`;
      parts.push({
        id: pid,
        d: dMatch[1],
        label: labelMatch ? labelMatch[1] : pid,
      });
    }
  }

  // <g class="coloring-lines"> 内の主線パスを抽出
  const lines: string[] = [];
  const linesGroupMatch = rawSvg.match(/<g[^>]*class="[^"]*coloring-lines[^"]*"[^>]*>([\s\S]*?)<\/g>/);
  if (linesGroupMatch) {
    const linePathRegex = /<path[^>]*d="([^"]+)"[^>]*>/g;
    let lMatch: RegExpExecArray | null;
    while ((lMatch = linePathRegex.exec(linesGroupMatch[1])) !== null) {
      lines.push(lMatch[1]);
    }
  }

  return {
    id,
    genre,
    title,
    parts,
    lines,
    rawSvg,
  };
}

export const ARTWORKS: Artwork[] = Object.entries(rawSvgModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([filename, rawSvg]) => parseSvgArtwork(filename, rawSvg));

export const artworksOf = (g: GenreId) => ARTWORKS.filter((a) => a.genre === g);
