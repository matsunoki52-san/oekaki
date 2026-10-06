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
  bgm: string;
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

import bgmAnimals from '../assets/BGM/塗り絵アプリ用BGM どうぶつ.mp3';
import bgmVehicles from '../assets/BGM/塗り絵アプリ用BGM4 のりもの.mp3';
import bgmFantasy from '../assets/BGM/塗り絵アプリ用BGM5 ファンタジー.mp3';
import bgmFood from '../assets/BGM/塗り絵アプリ用BGM2 たべもの.mp3';
import bgmAnime from '../assets/BGM/塗り絵アプリ用BGM3 アニメ.mp3';
import bgmOekaki from '../assets/BGM/塗り絵アプリ用BGM6 おえかき.mp3';

export const GENRES: Genre[] = [
  { id: 'animals', title: 'どうぶつ', emoji: '🦁', img: imgAnimals, bgm: bgmAnimals, color: '#ffb547', shadow: '#e08a12' },
  { id: 'vehicles', title: 'のりもの', emoji: '🚗', img: imgVehicles, bgm: bgmVehicles, color: '#5ec8ff', shadow: '#2a97d6' },
  { id: 'fantasy', title: 'ファンタジー', emoji: '✨', img: imgFantasy, bgm: bgmFantasy, color: '#c58cff', shadow: '#9256d9' },
  { id: 'food', title: 'たべもの', emoji: '🍰', img: imgFood, bgm: bgmFood, color: '#ff7fa8', shadow: '#dc4b7c' },
  { id: 'anime', title: 'アニメ', emoji: '🌸', img: imgAnime, bgm: bgmAnime, color: '#4ade80', shadow: '#16a34a' },
  { id: 'oekaki', title: 'おえかき', emoji: '✏️', img: imgOekaki, bgm: bgmOekaki, color: '#ff7070', shadow: '#d64747' },
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

const parsedArtworks = Object.entries(rawSvgModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([filename, rawSvg]) => parseSvgArtwork(filename, rawSvg));

const animeTitleMap: Record<number, string> = {
  1: 'ドキンちゃん',
  2: 'ジャムおじさん',
  3: 'しょくぱんまん',
  4: 'ドキン・コキン',
  5: 'バイキンマン',
  6: 'あかちゃんマン',
  8: 'フォーキー',
  9: 'スリンキー',
  10: 'レックス',
  11: 'ダッキー・バニー',
  12: 'ブルズアイ',
  13: 'ハム',
  16: 'バズ',
  17: 'べべフィン',
  18: 'グランパシャーク',
  19: 'ベイビーシャーク',
  20: 'シャークファミリー',
  22: 'ペッパ',
  23: 'ダディピッグ',
  25: 'はなちゃん',
  26: 'みみりん',
  27: 'クロミ',
  28: 'シナモン',
  29: 'ジョージ',
  30: 'トリッピー',
  31: 'ハローキティ',
  32: 'ピアノちゃん',
  33: 'ポチャッコ',
  34: 'ポムポムプリン',
  35: 'マイメロディ'
};

const finalArtworks = [];
let animeCount = 1;

for (const art of parsedArtworks) {
  if (art.genre === 'anime') {
    // 7, 14, 15, 24 は削除。21(古いジョージ)は29(新しいジョージ)に統合するため削除。
    if (animeCount === 7 || animeCount === 14 || animeCount === 15 || animeCount === 21 || animeCount === 24) {
      animeCount++;
      continue;
    }
    art.title = animeTitleMap[animeCount] || `${art.title} ${animeCount}`;
    animeCount++;
  }
  finalArtworks.push(art);
}

export const ARTWORKS: Artwork[] = [
  ...finalArtworks,
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
