/**
 * 台紙データ (src/components/svgs/*.svg から直接読み込み・パース)
 * --------------------------------------------------------------
 * プロジェクト内の src/components/svgs フォルダに格納されている80種のSVGファイル群を
 * import.meta.glob で参照し、アプリの台紙データとして読み込みます。
 */

export type GenreId = 'animals' | 'vehicles' | 'fantasy' | 'food' | 'anime' | 'oekaki';

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
  width: number;
  height: number;
}

export interface Genre {
  id: GenreId;
  title: string;
  emoji: string;
  img: string;
  color: string;
  shadow: string;
}

export const VB_W = 1376;
export const VB_H = 768;

import imgAnimals from '../assets/janru/どうぶつ.jpg';
import imgVehicles from '../assets/janru/のりもの.jpg';
import imgFantasy from '../assets/janru/ファンタジー.jpg';
import imgFood from '../assets/janru/たべもの.jpg';
import imgAnime from '../assets/janru/アニメ.jpg';
import imgOekaki from '../assets/janru/おえかき.jpg';

export const GENRES: Genre[] = [
  { id: 'animals', title: 'どうぶつ', emoji: '🦁', img: imgAnimals, color: '#ffb547', shadow: '#e08a12' },
  { id: 'vehicles', title: 'のりもの', emoji: '🚗', img: imgVehicles, color: '#5ec8ff', shadow: '#2a97d6' },
  { id: 'fantasy', title: 'ファンタジー', emoji: '✨', img: imgFantasy, color: '#c58cff', shadow: '#9256d9' },
  { id: 'food', title: 'たべもの', emoji: '🍰', img: imgFood, color: '#ff7fa8', shadow: '#dc4b7c' },
  { id: 'anime', title: 'アニメ', emoji: '🌸', img: imgAnime, color: '#4ade80', shadow: '#16a34a' },
  { id: 'oekaki', title: 'おえかき', emoji: '✏️', img: imgOekaki, color: '#ff7070', shadow: '#d64747' },
];

// src/components/svgs ディレクトリ内のSVGファイルをインポート
const rawSvgModules = import.meta.glob<string>('../components/svgs/*.svg', {
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
  if (baseName.startsWith('Characters_') || baseName.startsWith('Fantasy_')) genre = 'fantasy';
  else if (baseName.startsWith('Vehicles_')) genre = 'vehicles';
  else if (baseName.startsWith('Food_')) genre = 'food';
  else if (baseName.startsWith('Anime_')) genre = 'anime';

  const id = baseName.replace(/\.svg$/, '').toLowerCase().replace(/_/g, '-');

  // <path ... class="coloring-part" ...> からパーツ情報を抽出
  const parts: Part[] = [];
  const partRegex = /<path[^>]*class="[^"]*coloring-part[^"]*"[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = partRegex.exec(rawSvg)) !== null) {
    const tag = match[0];
    const idMatch = tag.match(/\bid="([^"]+)"/) || tag.match(/\bdata-part="([^"]+)"/);
    const dMatch = tag.match(/\bd="([^"]+)"/);
    const labelMatch = tag.match(/\bdata-label="([^"]+)"/);
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
    const linePathRegex = /<path[^>]*\bd="([^"]+)"[^>]*>/g;
    let lMatch: RegExpExecArray | null;
    while ((lMatch = linePathRegex.exec(linesGroupMatch[1])) !== null) {
      lines.push(lMatch[1]);
    }
  }

  const vbMatch = rawSvg.match(/viewBox="0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"/);
  const width = vbMatch ? parseFloat(vbMatch[1]) : VB_W;
  const height = vbMatch ? parseFloat(vbMatch[2]) : VB_H;

  return {
    id,
    genre,
    title,
    parts,
    lines,
    rawSvg,
    width,
    height,
  };
}

export const ARTWORKS: Artwork[] = [
  ...Object.entries(rawSvgModules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([filename, rawSvg]) => parseSvgArtwork(filename, rawSvg)),
  {
    id: 'oekaki-square',
    genre: 'oekaki',
    title: '正方形 (1:1)',
    parts: [],
    lines: [],
    rawSvg: '',
    width: 1024,
    height: 1024,
  },
  {
    id: 'oekaki-portrait',
    genre: 'oekaki',
    title: '縦長 (3:4)',
    parts: [],
    lines: [],
    rawSvg: '',
    width: 768,
    height: 1024,
  },
  {
    id: 'oekaki-landscape',
    genre: 'oekaki',
    title: '横長 (4:3)',
    parts: [],
    lines: [],
    rawSvg: '',
    width: 1024,
    height: 768,
  },
];

export const artworksOf = (g: GenreId) => ARTWORKS.filter((a) => a.genre === g);
