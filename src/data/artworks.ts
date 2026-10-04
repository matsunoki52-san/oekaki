/**
 * 台紙データ
 * --------------------------------------------------------------
 * - すべて viewBox="0 0 1024 768" 上の座標で定義する。
 * - parts は「下から上」の z-order で並べる（後のものほど手前）。
 *   各 part の d はそのまま <path d> と new Path2D(d) の両方に使われる。
 * - 1つの part に複数のサブパスを入れる場合は「互いに重ならない」こと
 *   （はみ出し防止の差し引き計算で evenodd を使うため）。
 * - lines は塗り領域を持たない装飾線（ひげ・口など）。pointer-events: none。
 * - 背景（台紙全体）は自動で最背面の part として追加される。
 */

export type GenreId = 'animals' | 'vehicles' | 'characters' | 'food';

export interface Part {
  id: string;
  d: string;
}

export interface Artwork {
  id: string;
  genre: GenreId;
  title: string;
  parts: Part[];
  lines?: string[];
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

/* ---------- パス生成ヘルパー ---------- */
const n = (v: number) => Math.round(v * 10) / 10;

export const circle = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${n(cy)}A${r} ${r} 0 1 0 ${n(cx + r)} ${n(cy)}A${r} ${r} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;

export const ellipse = (cx: number, cy: number, rx: number, ry: number, rotDeg = 0) => {
  const t = (rotDeg * Math.PI) / 180;
  const dx = rx * Math.cos(t);
  const dy = rx * Math.sin(t);
  return `M${n(cx - dx)} ${n(cy - dy)}A${rx} ${ry} ${rotDeg} 1 0 ${n(cx + dx)} ${n(cy + dy)}A${rx} ${ry} ${rotDeg} 1 0 ${n(cx - dx)} ${n(cy - dy)}Z`;
};

export const rect = (x: number, y: number, w: number, h: number, r = 0) => {
  if (!r) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return (
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
    `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
};

export const poly = (...pts: number[]) => {
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
  return d + 'Z';
};

export const star = (cx: number, cy: number, R: number, r: number, points = 5) => {
  const pts: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rad = i % 2 === 0 ? R : r;
    pts.push(n(cx + rad * Math.cos(a)), n(cy + rad * Math.sin(a)));
  }
  return poly(...pts);
};

/** 上端がまっすぐ、下端がたれている「クリーム」形状 */
const drippy = (x: number, y: number, w: number, h: number, drips: number, depth: number) => {
  const step = w / drips;
  let d = `M${x} ${y}H${x + w}V${y + h}`;
  for (let i = drips - 1; i >= 0; i--) {
    const x0 = x + step * (i + 1);
    const mid = x0 - step / 2;
    const x1 = x0 - step;
    const dd = i % 2 === 0 ? depth : depth * 0.55;
    d += `Q${n(x0)} ${y + h + dd} ${n(mid)} ${y + h + dd}Q${n(x1)} ${y + h + dd} ${n(x1)} ${y + h}`;
  }
  return d + 'Z';
};

const strawberry = (x: number, y: number) =>
  `M${x} ${y + 42}C${x - 40} ${y + 18} ${x - 34} ${y - 18} ${x} ${y - 12}C${x + 34} ${y - 18} ${x + 40} ${y + 18} ${x} ${y + 42}Z`;

const j = (...ds: string[]) => ds.join(' ');

/* ---------- ジャンル ---------- */
export const GENRES: Genre[] = [
  { id: 'animals', title: 'どうぶつ', emoji: '🐱', color: '#ffb547', shadow: '#e08a12' },
  { id: 'vehicles', title: 'のりもの', emoji: '🚗', color: '#5ec8ff', shadow: '#2a97d6' },
  { id: 'characters', title: 'キャラクター', emoji: '👻', color: '#c58cff', shadow: '#9256d9' },
  { id: 'food', title: 'たべもの', emoji: '🍰', color: '#ff7fa8', shadow: '#dc4b7c' },
];

/* ---------- 台紙 ---------- */
export const ARTWORKS: Artwork[] = [
  /* ===== どうぶつ ===== */
  {
    id: 'cat',
    genre: 'animals',
    title: 'ねこ',
    parts: [
      { id: 'tail', d: 'M690 600C800 600 860 520 830 430C815 390 860 380 870 420C905 540 820 650 690 650Z' },
      { id: 'body', d: ellipse(512, 580, 200, 140) },
      { id: 'belly', d: ellipse(512, 610, 110, 80) },
      { id: 'feet', d: j(ellipse(430, 695, 62, 34), ellipse(594, 695, 62, 34)) },
      { id: 'ears', d: j(poly(355, 240, 365, 95, 470, 175), poly(669, 240, 659, 95, 554, 175)) },
      { id: 'earsIn', d: j(poly(378, 205, 380, 132, 440, 178), poly(646, 205, 644, 132, 584, 178)) },
      { id: 'head', d: circle(512, 320, 175) },
      { id: 'eyes', d: j(ellipse(445, 305, 26, 36), ellipse(579, 305, 26, 36)) },
      { id: 'nose', d: poly(494, 368, 530, 368, 512, 390) },
      { id: 'cheeks', d: j(ellipse(392, 380, 32, 20), ellipse(632, 380, 32, 20)) },
    ],
    lines: [
      'M512 390Q512 418 482 418M512 390Q512 418 542 418',
      'M372 352L296 336M372 370L292 378M652 352L728 336M652 370L732 378',
    ],
  },
  {
    id: 'dog',
    genre: 'animals',
    title: 'いぬ',
    parts: [
      { id: 'tail', d: 'M340 560C260 545 230 470 262 435C282 470 300 505 360 520Z' },
      { id: 'body', d: ellipse(512, 590, 190, 130) },
      { id: 'spot', d: ellipse(600, 570, 60, 44) },
      { id: 'feet', d: j(ellipse(420, 702, 60, 32), ellipse(604, 702, 60, 32)) },
      { id: 'collar', d: rect(418, 478, 188, 36, 18) },
      { id: 'bell', d: circle(512, 532, 22) },
      { id: 'head', d: circle(512, 325, 160) },
      { id: 'ears', d: j(ellipse(356, 330, 55, 110, 20), ellipse(668, 330, 55, 110, -20)) },
      { id: 'muzzle', d: ellipse(512, 400, 86, 62) },
      { id: 'nose', d: ellipse(512, 372, 30, 20) },
      { id: 'eyes', d: j(circle(450, 295, 22), circle(574, 295, 22)) },
    ],
    lines: ['M512 392L512 422M512 422Q492 442 472 428M512 422Q532 442 552 428'],
  },
  {
    id: 'fish',
    genre: 'animals',
    title: 'さかな',
    parts: [
      { id: 'sand', d: 'M0 700Q256 660 512 700T1024 700V768H0Z' },
      { id: 'weedL', d: 'M120 768C90 680 160 640 120 560C100 520 150 500 160 540C190 620 140 680 190 768Z' },
      { id: 'weedR', d: 'M880 768C850 690 920 650 890 580C875 545 920 530 930 565C955 640 905 690 950 768Z' },
      { id: 'finTop', d: 'M400 245Q480 140 600 255Z' },
      { id: 'finBottom', d: 'M430 525Q480 610 560 530Z' },
      { id: 'tail', d: poly(700, 384, 860, 270, 830, 384, 860, 498) },
      { id: 'body', d: ellipse(480, 384, 250, 160) },
      { id: 'stripe1', d: 'M430 232Q470 384 430 536L480 540Q520 384 480 228Z' },
      { id: 'stripe2', d: 'M560 240Q600 384 560 528L610 515Q650 384 610 253Z' },
      { id: 'eye', d: circle(310, 350, 34) },
      { id: 'pupil', d: circle(318, 350, 14) },
      { id: 'bubbles', d: j(circle(220, 180, 26), circle(170, 110, 18), circle(250, 66, 13)) },
    ],
    lines: ['M340 300Q380 384 340 470', 'M240 410Q260 426 282 414'],
  },

  /* ===== のりもの ===== */
  {
    id: 'car',
    genre: 'vehicles',
    title: 'くるま',
    parts: [
      { id: 'road', d: rect(0, 640, 1024, 128) },
      { id: 'sun', d: circle(880, 120, 70) },
      { id: 'cloud', d: 'M150 220C110 220 110 160 160 160C170 110 250 110 265 150C300 120 360 150 345 190C380 200 370 240 340 240L170 240C150 240 150 225 150 220Z' },
      { id: 'cabin', d: 'M300 410L370 250Q380 230 405 230L640 230Q665 230 680 250L770 410Z' },
      { id: 'winR', d: 'M400 268Q407 255 422 255L530 255L530 395L340 395Z' },
      { id: 'winF', d: 'M560 255L640 255Q655 255 662 268L728 395L560 395Z' },
      { id: 'body', d: rect(170, 400, 690, 190, 60) },
      { id: 'light', d: ellipse(822, 478, 20, 28) },
      { id: 'wheels', d: j(circle(330, 600, 75), circle(700, 600, 75)) },
      { id: 'hubs', d: j(circle(330, 600, 30), circle(700, 600, 30)) },
    ],
    lines: ['M545 410L545 560', 'M478 470L515 470M590 470L627 470', 'M0 704H90M180 704H300M420 704H560M680 704H820M920 704H1024'],
  },
  {
    id: 'train',
    genre: 'vehicles',
    title: 'でんしゃ',
    parts: [
      { id: 'ground', d: rect(0, 690, 1024, 78) },
      { id: 'rail', d: rect(0, 660, 1024, 30) },
      { id: 'smoke', d: j(circle(590, 200, 30), circle(650, 138, 40), circle(744, 76, 48)) },
      { id: 'link', d: rect(455, 520, 80, 24, 8) },
      { id: 'carRoof', d: rect(70, 305, 420, 40, 20) },
      { id: 'car', d: rect(90, 330, 380, 250, 24) },
      { id: 'carWin', d: j(rect(130, 380, 120, 100, 18), rect(290, 380, 140, 100, 18)) },
      { id: 'chimneyTop', d: rect(545, 260, 90, 30, 12) },
      { id: 'chimney', d: rect(560, 285, 60, 110, 10) },
      { id: 'boiler', d: rect(520, 380, 230, 200, 30) },
      { id: 'lamp', d: circle(565, 440, 24) },
      { id: 'cab', d: rect(720, 240, 200, 340, 24) },
      { id: 'cabWin', d: rect(760, 290, 120, 110, 20) },
      { id: 'cabRoof', d: rect(700, 215, 240, 40, 20) },
      { id: 'wheels', d: j(circle(170, 610, 55), circle(390, 610, 55), circle(610, 610, 55), circle(830, 610, 55)) },
      { id: 'hubs', d: j(circle(170, 610, 18), circle(390, 610, 18), circle(610, 610, 18), circle(830, 610, 18)) },
    ],
  },
  {
    id: 'rocket',
    genre: 'vehicles',
    title: 'ロケット',
    parts: [
      { id: 'stars', d: j(star(150, 150, 40, 18), star(880, 180, 32, 14), star(820, 640, 36, 16), star(180, 600, 30, 13)) },
      { id: 'planet', d: circle(860, 420, 75) },
      { id: 'flame', d: 'M440 600Q512 770 584 600Z' },
      { id: 'flameIn', d: 'M475 600Q512 705 549 600Z' },
      { id: 'fins', d: j('M430 470L330 600L340 645L440 595Z', 'M594 470L694 600L684 645L584 595Z') },
      { id: 'body', d: 'M424 610L424 300Q424 180 512 100Q600 180 600 300L600 610Z' },
      { id: 'nose', d: 'M424 300Q424 180 512 100Q600 180 600 300Z' },
      { id: 'band', d: rect(424, 520, 176, 40) },
      { id: 'window', d: circle(512, 390, 52) },
      { id: 'windowIn', d: circle(512, 390, 32) },
    ],
  },

  /* ===== キャラクター ===== */
  {
    id: 'robot',
    genre: 'characters',
    title: 'ロボット',
    parts: [
      { id: 'antenna', d: rect(502, 90, 20, 70, 6) },
      { id: 'ball', d: circle(512, 80, 24) },
      { id: 'ears', d: j(rect(340, 210, 40, 80, 14), rect(644, 210, 40, 80, 14)) },
      { id: 'neck', d: rect(482, 340, 60, 40, 8) },
      { id: 'head', d: rect(370, 150, 284, 200, 40) },
      { id: 'eyes', d: j(circle(450, 235, 34), circle(574, 235, 34)) },
      { id: 'pupils', d: j(circle(458, 240, 14), circle(582, 240, 14)) },
      { id: 'mouth', d: rect(440, 290, 144, 34, 17) },
      { id: 'arms', d: j(rect(262, 392, 110, 44, 22), rect(652, 392, 110, 44, 22)) },
      { id: 'legs', d: j(rect(400, 600, 70, 100, 16), rect(554, 600, 70, 100, 16)) },
      { id: 'feet', d: j(rect(380, 690, 110, 44, 22), rect(534, 690, 110, 44, 22)) },
      { id: 'body', d: rect(360, 370, 304, 250, 36) },
      { id: 'panel', d: rect(420, 420, 184, 110, 20) },
      { id: 'heart', d: 'M512 508C468 478 468 440 492 440C503 440 512 450 512 460C512 450 521 440 532 440C556 440 556 478 512 508Z' },
      { id: 'buttons', d: j(circle(460, 574, 20), circle(512, 574, 20), circle(564, 574, 20)) },
      { id: 'hands', d: j(circle(252, 414, 34), circle(772, 414, 34)) },
    ],
    lines: ['M476 290V324M512 290V324M548 290V324'],
  },
  {
    id: 'ghost',
    genre: 'characters',
    title: 'おばけ',
    parts: [
      { id: 'moon', d: circle(860, 140, 70) },
      { id: 'stars', d: j(star(150, 140, 30, 13), star(260, 90, 20, 9), star(900, 330, 24, 10), star(130, 520, 26, 11)) },
      { id: 'arms', d: j('M335 380C270 380 240 430 260 450C280 465 310 430 335 430Z', 'M689 380C754 380 784 430 764 450C744 465 714 430 689 430Z') },
      {
        id: 'body',
        d: 'M330 640L330 330C330 180 420 110 512 110C604 110 694 180 694 330L694 640Q656 600 618 640Q583 680 547 640Q512 600 477 640Q441 680 406 640Q368 600 330 640Z',
      },
      { id: 'eyes', d: j(ellipse(450, 300, 28, 40), ellipse(574, 300, 28, 40)) },
      { id: 'shine', d: j(circle(458, 286, 10), circle(582, 286, 10)) },
      { id: 'mouth', d: 'M472 380Q512 440 552 380Z' },
      { id: 'cheeks', d: j(ellipse(400, 370, 30, 18), ellipse(624, 370, 30, 18)) },
    ],
  },
  {
    id: 'starkun',
    genre: 'characters',
    title: 'おほしさま',
    parts: [
      { id: 'small', d: j(star(150, 150, 70, 32), star(880, 140, 60, 28), star(140, 625, 55, 25), star(890, 620, 65, 30)) },
      { id: 'star', d: star(512, 410, 290, 145) },
      { id: 'eyes', d: j(circle(460, 395, 24), circle(564, 395, 24)) },
      { id: 'cheeks', d: j(ellipse(422, 452, 26, 16), ellipse(602, 452, 26, 16)) },
      { id: 'mouth', d: 'M480 455Q512 492 544 455Z' },
    ],
  },

  /* ===== たべもの ===== */
  {
    id: 'icecream',
    genre: 'food',
    title: 'アイス',
    parts: [
      { id: 'cone', d: poly(400, 400, 624, 400, 512, 720) },
      {
        id: 'scoop1',
        d: 'M382 380C370 260 440 220 512 220C584 220 654 260 642 380Q620 420 598 390Q576 430 552 395Q530 425 512 395Q490 430 468 395Q446 425 426 390Q404 420 382 380Z',
      },
      { id: 'sprinkles', d: j(ellipse(450, 310, 14, 5, 30), ellipse(560, 290, 14, 5, -40), ellipse(600, 345, 14, 5, 70), ellipse(420, 355, 14, 5, -20), ellipse(515, 340, 14, 5, 10)) },
      { id: 'scoop2', d: 'M420 230C410 140 460 95 512 95C564 95 614 140 604 230Q585 260 565 235Q545 265 512 238Q480 265 459 235Q440 260 420 230Z' },
      { id: 'cherry', d: circle(512, 80, 30) },
    ],
    lines: ['M414 440L568 560M442 520L540 640M610 440L456 560M582 520L484 640', 'M512 50Q518 25 548 14'],
  },
  {
    id: 'cake',
    genre: 'food',
    title: 'ケーキ',
    parts: [
      { id: 'plate', d: ellipse(512, 660, 330, 50) },
      { id: 'candle', d: rect(497, 200, 30, 120, 8) },
      { id: 'top', d: rect(330, 320, 364, 160, 24) },
      { id: 'topCream', d: drippy(330, 305, 364, 30, 7, 26) },
      { id: 'bottom', d: rect(250, 470, 524, 190, 24) },
      { id: 'bottomCream', d: drippy(250, 455, 524, 34, 10, 30) },
      { id: 'dots', d: j(...[0, 1, 2, 3, 4, 5].map((i) => circle(312 + i * 80, 600, 18))) },
      { id: 'berries', d: j(strawberry(420, 290), strawberry(604, 290)) },
      { id: 'flame', d: 'M512 120Q548 165 512 195Q476 165 512 120Z' },
    ],
  },
  {
    id: 'fruits',
    genre: 'food',
    title: 'くだもの',
    parts: [
      { id: 'table', d: rect(0, 660, 1024, 108) },
      { id: 'stem', d: 'M296 335Q290 280 310 240L325 248Q308 285 312 335Z' },
      { id: 'apple', d: 'M300 330C230 260 120 300 130 420C140 540 230 620 300 590C370 620 460 540 470 420C480 300 370 260 300 330Z' },
      { id: 'appleLeaf', d: 'M318 268Q360 208 420 228Q380 290 318 268Z' },
      { id: 'orange', d: circle(730, 420, 140) },
      { id: 'orangeLeaf', d: 'M730 288Q770 230 830 245Q790 302 730 288Z' },
      ...[
        [442, 110],
        [512, 110],
        [582, 110],
        [477, 172],
        [547, 172],
        [512, 234],
      ].map(([x, y], i) => ({ id: `grape${i}`, d: circle(x, y, 34) })),
    ],
    lines: ['M512 76L512 40Q530 30 545 36', 'M700 420l8 8M730 400l0 10M760 425l-8 6'],
  },
];

export const BG_PART: Part = { id: '__bg', d: rect(0, 0, VB_W, VB_H) };

export const artworksOf = (g: GenreId) => ARTWORKS.filter((a) => a.genre === g);
