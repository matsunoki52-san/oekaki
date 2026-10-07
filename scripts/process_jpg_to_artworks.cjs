const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const Potrace = require('potrace').Potrace;
const Bitmap = require('potrace/lib/types/Bitmap');

const JPG_DIR = path.resolve(__dirname, '../jpg');
const OUT_DIR = path.resolve(__dirname, '../src/components/svgs');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 1. ジャンル判定ルール (単語境界で誤マッチ防止)
const GENRE_RULES = [
  { genre: 'vehicles', prefix: 'Vehicles', regex: /(^|_)(airplane|bicycle|bus|crane_truck|cruise_ship|excavator|fire_engine|helicopter|hot_air_balloon|motorcycle|police_car|rocket|submarine|taxi|truck|ufo|yacht)(_|\.|$)/i },
  { genre: 'animals', prefix: 'Animals', regex: /(^|_)(alpaca|bear|cow|dolphin|frog|hedgehog|horse|pig|sheep|turtle|dinosaur|capybara|lion|cat|dog|elephant|giraffe|koala|unicorn|monkey|ninja_dog|owl|panda|penguin|rabbit|squirrel|fox)(_|\.|$)/i },
  { genre: 'food', prefix: 'Food', regex: /(^|_)(apple|ramen|bowl|grapes|omurice|curry|pudding|parfait|banana|hamburger|macarons|pancakes|pizza|rice_ball|sandwich|crepe|shortcake|sushi|ice_cream|donut|watermelon)(_|\.|$)/i },
  { genre: 'characters', prefix: 'Characters', regex: /(^|_)(angel|boy|alien|dragon|explorer|fairy|ghost|idol_singer|magical_girl|monster|ninja_throwing|pirate|prince|princess|robot|superhero|witch)(_|\.|$)/i },
  { genre: 'anime', prefix: 'Anime', regex: /(^|\/|_)Anime\//i },
];

// 重複（同じタイトル）を1つにまとめるジャンル
const DEDUPE_GENRES = new Set(['food']);

// 2. 日本語タイトル判定ルール (優先順位を考慮)
const TITLE_RULES = [
  // 複合語・特定フレーズ優先
  { match: /baby_dinosaur/i, title: 'あかちゃんきょうりゅう' },
  { match: /ninja_dog/i, title: 'にんじゃ犬' },
  { match: /ninja_throwing/i, title: 'にんじゃ' },
  { match: /magical_unicorn/i, title: 'ユニコーン' },
  { match: /magical_girl/i, title: 'まほうしょうじょ' },
  { match: /crane_truck/i, title: 'クレーンしゃ' },
  { match: /fire_engine/i, title: 'しょうぼうしゃ' },
  { match: /police_car/i, title: 'パトカー' },
  { match: /cruise_ship/i, title: 'きゃくせん' },
  { match: /hot_air_balloon/i, title: 'ききゅう' },
  { match: /curry/i, title: 'カレーライス' },
  { match: /omurice/i, title: 'オムライス' },
  { match: /shortcake/i, title: 'ショートケーキ' },
  { match: /ice_cream/i, title: 'アイスクリーム' },
  { match: /rice_ball/i, title: 'おにぎり' },
  { match: /boy_holding_sword/i, title: 'ゆうしゃ' },
  { match: /dog_holding_bone/i, title: 'イヌ' },
  { match: /monkey/i, title: 'サル' },
  { match: /princess/i, title: 'おひめさま' },
  { match: /prince/i, title: 'おうじさま' },
  { match: /yacht/i, title: 'ヨット' },
  { match: /ufo/i, title: 'UFO' },
  // 単語
  { match: /airplane/i, title: 'ひこうき' },
  { match: /alpaca/i, title: 'アルパカ' },
  { match: /angel/i, title: 'てんし' },
  { match: /apple/i, title: 'りんご' },
  { match: /bicycle/i, title: 'じてんしゃ' },
  { match: /ramen/i, title: 'ラーメン' },
  { match: /grapes/i, title: 'ぶどう' },
  { match: /bus/i, title: 'バス' },
  { match: /capybara/i, title: 'カピバラ' },
  { match: /lion/i, title: 'ライオン' },
  { match: /(^|_)cat(_|\.|$)/i, title: 'ネコ' },
  { match: /pudding/i, title: 'プリン' },
  { match: /alien/i, title: 'うちゅうじん' },
  { match: /dragon/i, title: 'ドラゴン' },
  { match: /elephant/i, title: 'ゾウ' },
  { match: /excavator/i, title: 'ショベルカー' },
  { match: /explorer/i, title: 'たんけんか' },
  { match: /fairy/i, title: 'ようせい' },
  { match: /parfait/i, title: 'パフェ' },
  { match: /ghost/i, title: 'おばけ' },
  { match: /giraffe/i, title: 'キリン' },
  { match: /banana/i, title: 'バナナ' },
  { match: /hamburger/i, title: 'ハンバーガー' },
  { match: /helicopter/i, title: 'ヘリコプター' },
  { match: /idol_singer/i, title: 'アイドル' },
  { match: /koala/i, title: 'コアラ' },
  { match: /macarons/i, title: 'マカロン' },
  { match: /monster/i, title: 'かいじゅう' },
  { match: /motorcycle/i, title: 'バイク' },
  { match: /(^|_)owl(_|\.|$)/i, title: 'フクロウ' },
  { match: /pancakes/i, title: 'パンケーキ' },
  { match: /panda/i, title: 'パンダ' },
  { match: /penguin/i, title: 'ペンギン' },
  { match: /pirate/i, title: 'かいぞく' },
  { match: /pizza/i, title: 'ピザ' },
  { match: /rabbit/i, title: 'うさぎ' },
  { match: /robot/i, title: 'ロボット' },
  { match: /rocket/i, title: 'ロケット' },
  { match: /sandwich/i, title: 'サンドイッチ' },
  { match: /squirrel/i, title: 'リス' },
  { match: /crepe/i, title: 'クレープ' },
  { match: /submarine/i, title: 'せんすいかん' },
  { match: /superhero/i, title: 'ヒーロー' },
  { match: /sushi/i, title: 'おすし' },
  { match: /taxi/i, title: 'タクシー' },
  { match: /truck/i, title: 'トラック' },
  { match: /donut/i, title: 'ドーナツ' },
  { match: /fox/i, title: 'キツネ' },
  { match: /watermelon/i, title: 'すいか' },
  { match: /bear/i, title: 'クマ' },
  { match: /cow/i, title: 'ウシ' },
  { match: /(^|_)dog(_|\.|$)/i, title: 'イヌ' },
  { match: /dolphin/i, title: 'イルカ' },
  { match: /frog/i, title: 'カエル' },
  { match: /hedgehog/i, title: 'ハリネズミ' },
  { match: /horse/i, title: 'ウマ' },
  { match: /pig/i, title: 'ブタ' },
  { match: /sheep/i, title: 'ヒツジ' },
  { match: /turtle/i, title: 'カメ' },
  { match: /rabbit/i, title: 'ウサギ' },
  { match: /witch/i, title: 'まじょ' }
];

function getGenre(filename) {
  for (const rule of GENRE_RULES) {
    if (rule.regex.test(filename)) return rule;
  }
  return GENRE_RULES.find((r) => r.genre === 'animals'); // fallback animals
}

function getTitle(filename) {
  for (const rule of TITLE_RULES) {
    if (rule.match.test(filename)) return rule.title;
  }
  return 'ぬりえ';
}

function processJpgFile(filename, genreInfo, counter) {
  const filePath = path.join(JPG_DIR, filename);
  const raw = fs.readFileSync(filePath);
  const { width: W, height: H, data } = jpeg.decode(raw);

  // 1. 主線のベクター化前処理 (アニメの場合はモルフォロジー変換で線を太く結合＆ノイズ除去)
  let lineBm = new Bitmap(W, H);
  for (let i = 0; i < W * H; i++) {
    lineBm.data[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  if (genreInfo.genre === 'anime') {
    // 2値化してノイズ除去（クロージング処理：膨張 -> 収縮）
    const temp = new Uint8Array(W * H);
    const radius = 1; // 結合半径を小さくして線が太くなりすぎるのを防ぐ
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let minLum = 255;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
              minLum = Math.min(minLum, lineBm.data[ny * W + nx]);
            }
          }
        }
        temp[y * W + x] = minLum; // 黒(線)を広げる(Dilation of black)
      }
    }
    const temp2 = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let maxLum = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
              maxLum = Math.max(maxLum, temp[ny * W + nx]);
            }
          }
        }
        temp2[y * W + x] = maxLum; // 白(背景)を広げる(Erosion of black)
      }
    }
    // 反映
    for (let i = 0; i < W * H; i++) {
      lineBm.data[i] = temp2[i];
    }
  }

  // アニメはゴミ(文字等)が多いため turdSize を大きくして小さなパスを無視
  const tSize = genreInfo.genre === 'anime' ? 120 : 4;
  const lineTrace = new Potrace({ optCurve: true, turdSize: tSize });
  lineTrace._luminanceData = lineBm;
  lineTrace._imageLoaded = true;
  const lineTag = lineTrace.getPathTag('black');
  const lineDMatch = lineTag.match(/d="([^"]+)"/);
  const lineD = lineDMatch ? lineDMatch[1] : '';

  // 2. 2値化（0: 線, 1: 白地）
  const binary = new Uint8Array(W * H);
  const threshold = genreInfo.genre === 'anime' ? 160 : 165;
  for (let i = 0; i < W * H; i++) {
    binary[i] = lineBm.data[i] >= threshold ? 1 : 0;
  }

  // 3. 連結成分解析 (CCA: Connected Component Analysis)
  const visited = new Int32Array(W * H).fill(-1);
  let compId = 0;
  const queue = new Int32Array(W * H);
  const components = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (binary[idx] === 1 && visited[idx] === -1) {
        let head = 0, tail = 0;
        queue[tail++] = idx;
        visited[idx] = compId;
        let minX = x, maxX = x, minY = y, maxY = y;
        let count = 0;

        while (head < tail) {
          const curr = queue[head++];
          count++;
          const cx = curr % W;
          const cy = Math.floor(curr / W);
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
          const neighbors = [
            cx > 0 ? curr - 1 : -1, cx < W - 1 ? curr + 1 : -1,
            cy > 0 ? curr - W : -1, cy < H - 1 ? curr + W : -1
          ];
          for (const n of neighbors) {
            if (n !== -1 && binary[n] === 1 && visited[n] === -1) {
              visited[n] = compId;
              queue[tail++] = n;
            }
          }
        }
        components.push({
          id: compId, count,
          bbox: { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 },
          isBg: minX === 0 || maxX === W - 1 || minY === 0 || maxY === H - 1
        });
        compId++;
      }
    }
  }

  // 3歳児向けに微小ノイズ（< 200px）を除外して面積順ソート
  const validComps = components.filter(c => c.count >= 200).sort((a, b) => b.count - a.count);

  // 4. 各パーツのベクター化（重なりなし・独立した閉じたパス）
  const sharedBm = new Bitmap(W, H);
  sharedBm.data.fill(255);

  const parts = [];
  let bgIndex = 0;
  let partIndex = 1;

  for (const comp of validComps) {
    const pad = 2;
    const x0 = Math.max(0, comp.bbox.minX - pad);
    const x1 = Math.min(W - 1, comp.bbox.maxX + pad);
    const y0 = Math.max(0, comp.bbox.minY - pad);
    const y1 = Math.min(H - 1, comp.bbox.maxY + pad);

    // 塗り境界を黒線内に1px膨張（隣接パーツにはみ出さず、線の下に潜り込ませる）
    for (let y = comp.bbox.minY; y <= comp.bbox.maxY; y++) {
      for (let x = comp.bbox.minX; x <= comp.bbox.maxX; x++) {
        if (visited[y * W + x] === comp.id) {
          sharedBm.data[y * W + x] = 0;
          if (x > 0 && binary[y * W + x - 1] === 0) sharedBm.data[y * W + x - 1] = 0;
          if (x < W - 1 && binary[y * W + x + 1] === 0) sharedBm.data[y * W + x + 1] = 0;
          if (y > 0 && binary[(y - 1) * W + x] === 0) sharedBm.data[(y - 1) * W + x] = 0;
          if (y < H - 1 && binary[(y + 1) * W + x] === 0) sharedBm.data[(y + 1) * W + x] = 0;
        }
      }
    }

    const p = new Potrace({ optCurve: true, turdSize: 4 });
    p._luminanceData = sharedBm;
    p._imageLoaded = true;
    const tag = p.getPathTag();
    const dMatch = tag.match(/d="([^"]+)"/);
    const d = dMatch ? dMatch[1] : '';

    let pid = '';
    let label = '';
    if (comp.isBg) {
      pid = bgIndex === 0 ? 'bg' : `bg-${bgIndex}`;
      label = 'はいけい';
      bgIndex++;
    } else {
      pid = `part-${partIndex}`;
      label = `パーツ ${partIndex}`;
      partIndex++;
    }

    parts.push({
      id: pid,
      label,
      isBg: comp.isBg,
      d
    });

    // sharedBm をリセット
    for (let y = y0; y <= y1; y++) {
      sharedBm.data.fill(255, y * W + x0, y * W + x1 + 1);
    }
  }

  // 5. SVGの生成
  const baseNameOnly = path.basename(filename);
  let title = getTitle(baseNameOnly);
  if (genreInfo.genre === 'anime') title = 'アニメ';

  const outSvg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <title>${title}</title>
  <g class="coloring-parts" fill="transparent" stroke="none">
${parts.map(p => `    <path id="${p.id}" data-part="${p.id}" data-label="${p.label}" class="coloring-part ${p.isBg ? 'coloring-part--bg' : ''}" d="${p.d}" fill="transparent" pointer-events="all" />`).join('\n')}
  </g>
  <g class="coloring-lines" pointer-events="none">
    <path d="${lineD}" fill="black" fill-rule="evenodd" stroke="none" />
  </g>
</svg>`;

  // 連番付きファイル名
  const cleanBase = baseNameOnly.replace(/\.jpe?g$/i, '').replace(/_\d{14}(_\d+)?$/, '').replace(/_result$/, '');
  const outFileName = `${genreInfo.prefix}_${String(counter).padStart(2, '0')}_${cleanBase}.svg`;
  fs.writeFileSync(path.join(OUT_DIR, outFileName), outSvg);
  return { outFileName, title, partsCount: parts.length };
}

function run() {
  let allFiles = [];
  const readDirRec = (dir, prefix = '') => {
    for (const f of fs.readdirSync(dir)) {
      if (f === '.DS_Store') continue;
      const fullPath = path.join(dir, f);
      const relPath = prefix ? `${prefix}/${f}` : f;
      if (fs.statSync(fullPath).isDirectory()) {
        readDirRec(fullPath, relPath);
      } else if (f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg')) {
        allFiles.push(relPath);
      }
    }
  };
  readDirRec(JPG_DIR);
  allFiles.sort();
  console.log(`Found ${allFiles.length} JPG files in ${JPG_DIR}`);

  // 既存の古いSVGファイルを削除
  const oldFiles = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.svg'));
  for (const f of oldFiles) {
    fs.unlinkSync(path.join(OUT_DIR, f));
  }
  console.log(`Cleaned ${oldFiles.length} old SVG files from ${OUT_DIR}`);

  const counts = { animals: 0, vehicles: 0, characters: 0, food: 0, anime: 0 };
  const startTime = Date.now();

  const seenTitles = new Set();
  const skipped = [];

  allFiles.forEach((file, idx) => {
    const genreInfo = getGenre(file);
    if (DEDUPE_GENRES.has(genreInfo.genre)) {
      const key = `${genreInfo.genre}:${getTitle(file)}`;
      if (seenTitles.has(key)) {
        skipped.push(file);
        return;
      }
      seenTitles.add(key);
    }
    counts[genreInfo.genre]++;
    const counter = counts[genreInfo.genre];
    const res = processJpgFile(file, genreInfo, counter);
    if ((idx + 1) % 15 === 0 || idx + 1 === allFiles.length) {
      console.log(`[${idx + 1}/${allFiles.length}] Processed ${res.outFileName} (${res.title}, ${res.partsCount} parts)`);
    }
  });

  console.log(`\nSuccessfully processed all ${allFiles.length} files in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
  console.log('Category breakdown:', counts);
  if (skipped.length) console.log(`Skipped ${skipped.length} duplicates:`, skipped);
}

run();
