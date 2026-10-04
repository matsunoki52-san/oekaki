const fs = require('fs');
const path = require('path');

const VB_W = 1024;
const VB_H = 768;

function n(v) {
  return Math.round(v * 10) / 10;
}

// ---------------- 幾何・ベジェヘルパー ----------------
function circle(cx, cy, r) {
  return `M${n(cx - r)} ${n(cy)}A${r} ${r} 0 1 0 ${n(cx + r)} ${n(cy)}A${r} ${r} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;
}

function ellipse(cx, cy, rx, ry) {
  return `M${n(cx - rx)} ${n(cy)}A${rx} ${ry} 0 1 0 ${n(cx + rx)} ${n(cy)}A${rx} ${ry} 0 1 0 ${n(cx - rx)} ${n(cy)}Z`;
}

function pill(x, y, w, h, r = Math.min(w, h) / 2) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

function poly(...pts) {
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
  return d + 'Z';
}

function hill(y0 = 640, y1 = 670) {
  return `M0 ${y0}Q${VB_W / 2} ${y1 - 35} ${VB_W} ${y1}V${VB_H}H0Z`;
}

function wavyPuff(cx, cy, w, h) {
  const rx = w / 2;
  const ry = h / 2;
  return `M${n(cx - rx + 25)} ${n(cy + ry)}C${n(cx - rx - 15)} ${n(cy + ry)} ${n(cx - rx - 20)} ${n(cy)} ${n(cx - rx + 15)} ${n(cy - ry * 0.2)}C${n(cx - rx)} ${n(cy - ry - 20)} ${n(cx - rx * 0.3)} ${n(cy - ry - 30)} ${n(cx)} ${n(cy - ry)}C${n(cx + rx * 0.3)} ${n(cy - ry - 30)} ${n(cx + rx)} ${n(cy - ry - 15)} ${n(cx + rx - 10)} ${n(cy - ry * 0.2)}C${n(cx + rx + 20)} ${n(cy)} ${n(cx + rx + 10)} ${n(cy + ry)} ${n(cx + rx - 25)} ${n(cy + ry)}Z`;
}

function scallopDonut(cx, cy, rOut, rIn, puffs = 10) {
  let d = '';
  for (let i = 0; i < puffs; i++) {
    const a0 = (i * 2 * Math.PI) / puffs;
    const a1 = ((i + 1) * 2 * Math.PI) / puffs;
    const aMid = (a0 + a1) / 2;
    const x0 = cx + rOut * Math.cos(a0);
    const y0 = cy + rOut * Math.sin(a0);
    const xMid = cx + (rOut + 35) * Math.cos(aMid);
    const yMid = cy + (rOut + 35) * Math.sin(aMid);
    const x1 = cx + rOut * Math.cos(a1);
    const y1 = cy + rOut * Math.sin(a1);
    if (i === 0) d += `M${n(x0)} ${n(y0)}`;
    d += `Q${n(xMid)} ${n(yMid)} ${n(x1)} ${n(y1)}`;
  }
  d += 'Z';
  d += ` M${n(cx - rIn)} ${n(cy)}A${rIn} ${rIn} 0 0 1 ${n(cx + rIn)} ${n(cy)}A${rIn} ${rIn} 0 0 1 ${n(cx - rIn)} ${n(cy)}Z`;
  return d;
}

function eyesSmile(cx, cy, span = 65, eyeR = 14, mouthW = 42, mouthDrop = 22) {
  const x1 = cx - span;
  const x2 = cx + span;
  return [
    `M${x1} ${cy - eyeR}A${eyeR} ${eyeR} 0 1 1 ${x1 - 0.1} ${cy - eyeR}M${x1 - 3} ${cy - eyeR + 4}a4 4 0 1 0 8 0a4 4 0 1 0 -8 0`,
    `M${x2} ${cy - eyeR}A${eyeR} ${eyeR} 0 1 1 ${x2 - 0.1} ${cy - eyeR}M${x2 - 3} ${cy - eyeR + 4}a4 4 0 1 0 8 0a4 4 0 1 0 -8 0`,
    `M${cx - mouthW / 2} ${cy + 28}Q${cx} ${cy + 28 + mouthDrop} ${cx + mouthW / 2} ${cy + 28}`,
    `M${x1 - 25} ${cy + 18}q8 8 16 0M${x2 + 9} ${cy + 18}q8 8 16 0`
  ];
}

function star(cx, cy, R, r, points = 5) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rad = i % 2 === 0 ? R : r;
    pts.push(n(cx + rad * Math.cos(a)), n(cy + rad * Math.sin(a)));
  }
  return poly(...pts);
}

// ---------------- モチーフデータ構築 ----------------
const animals = [
  {
    id: 'lion',
    title: 'ライオン',
    parts: [
      { id: 'mane', d: scallopDonut(512, 330, 240, 140, 10) },
      { id: 'face', d: circle(512, 330, 138) },
      { id: 'body', d: pill(362, 475, 300, 200, 70) },
      { id: 'tail', d: 'M660 560C780 560 840 480 810 400C795 370 840 360 850 395C880 500 810 610 660 610Z' },
      { id: 'ground', d: hill(660, 680) }
    ],
    lines: [
      ...eyesSmile(512, 330),
      'M496 360h32l-16 20Z',
      'M400 370l-60 -10M400 385l-60 10M624 370l60 -10M624 385l60 10'
    ]
  },
  {
    id: 'elephant',
    title: 'ぞう',
    parts: [
      { id: 'ear', d: wavyPuff(300, 340, 220, 260) },
      { id: 'head', d: circle(490, 340, 140) },
      { id: 'trunk', d: 'M440 440C390 490 320 460 320 380C320 340 350 330 360 360C360 410 400 420 450 370Z' },
      { id: 'body', d: pill(540, 360, 300, 290, 90) },
      { id: 'water', d: `${circle(310, 220, 25)} ${circle(230, 260, 20)} ${circle(340, 150, 16)}` },
      { id: 'ground', d: hill(640, 660) }
    ],
    lines: [
      'M490 320a14 14 0 1 1 -0.1 0',
      'M490 370q16 16 32 0',
      'M340 400q10 -10 20 0M360 430q10 -10 20 0',
      'M720 630q15 -20 30 0M780 630q15 -20 30 0'
    ]
  },
  {
    id: 'giraffe',
    title: 'キリン',
    parts: [
      { id: 'head', d: pill(460, 130, 110, 120, 45) },
      { id: 'ears', d: `${poly(420, 150, 370, 110, 400, 170)} ${poly(604, 150, 654, 110, 624, 170)}` },
      { id: 'neck', d: poly(490, 230, 530, 230, 560, 480, 470, 480) },
      { id: 'body', d: pill(420, 475, 340, 180, 65) },
      { id: 'clouds', d: wavyPuff(800, 180, 240, 110) },
      { id: 'ground', d: hill(650, 670) }
    ],
    lines: [
      'M480 170a12 12 0 1 1 -0.1 0',
      'M495 210q15 15 30 0',
      'M480 130v-40a8 8 0 1 1 16 0v40M530 130v-40a8 8 0 1 1 16 0v40',
      'M495 300a16 16 0 1 0 32 0a16 16 0 1 0 -32 0M485 380a18 18 0 1 0 36 0a18 18 0 1 0 -36 0'
    ]
  },
  {
    id: 'panda',
    title: 'パンダ',
    parts: [
      { id: 'ears', d: `${circle(380, 190, 48)} ${circle(644, 190, 48)}` },
      { id: 'head', d: circle(512, 330, 160) },
      { id: 'body', d: pill(362, 480, 300, 180, 70) },
      { id: 'bamboo', d: pill(680, 260, 45, 390, 18) },
      { id: 'ground', d: hill(650, 670) }
    ],
    lines: [
      'M445 285a24 32 20 1 0 48 0a24 32 20 1 0 -48 0',
      'M531 285a24 32 -20 1 0 48 0a24 32 -20 1 0 -48 0',
      'M460 295a10 10 0 1 1 0 -0.1M564 295a10 10 0 1 1 0 -0.1',
      'M496 360h32l-16 20ZM512 380q-20 20 -40 0M512 380q20 20 40 0',
      'M675 360h55M675 460h55M675 560h55'
    ]
  },
  {
    id: 'rabbit',
    title: 'うさぎ',
    parts: [
      { id: 'ears', d: `${pill(420, 70, 65, 230, 30)} ${pill(540, 70, 65, 230, 30)}` },
      { id: 'head', d: circle(512, 360, 150) },
      { id: 'body', d: pill(382, 500, 260, 165, 75) },
      { id: 'carrot', d: poly(700, 440, 780, 580, 660, 520) },
      { id: 'ground', d: hill(650, 670) }
    ],
    lines: [
      ...eyesSmile(512, 360, 55, 14, 34, 18),
      'M502 385l10 12l10 -12Z',
      'M440 395l-50 -8M440 408l-50 8M584 395l50 -8M584 408l50 8',
      'M720 440q-20 -30 0 -60M740 435q10 -40 40 -30'
    ]
  },
  {
    id: 'cat',
    title: 'ねこ',
    parts: [
      { id: 'ears', d: `${poly(320, 260, 340, 140, 430, 210)} ${poly(450, 210, 530, 140, 550, 260)}` },
      { id: 'head', d: circle(420, 350, 145) },
      { id: 'body', d: ellipse(590, 490, 190, 140) },
      { id: 'yarn', d: circle(780, 540, 70) },
      { id: 'ground', d: hill(650, 670) }
    ],
    lines: [
      ...eyesSmile(420, 350, 55, 14, 36, 18),
      'M412 370l8 10l8 -10Z',
      'M350 375l-60 -10M350 390l-60 10M490 375l60 -10M490 390l60 10',
      'M750 510q30 -20 60 10M740 560q40 20 70 -10',
      'M780 610c-30 40 -120 40 -150 10'
    ]
  },
  {
    id: 'dog',
    title: 'いぬ',
    parts: [
      { id: 'ears', d: `${pill(310, 250, 70, 180, 35)} ${pill(644, 250, 70, 180, 35)}` },
      { id: 'head', d: circle(512, 340, 155) },
      { id: 'bone', d: pill(390, 430, 244, 46, 20) },
      { id: 'body', d: pill(372, 485, 280, 175, 70) },
      { id: 'ground', d: hill(650, 670) }
    ],
    lines: [
      ...eyesSmile(512, 330, 65, 14, 40, 20),
      'M494 365a18 12 0 1 0 36 0a18 12 0 1 0 -36 0',
      'M390 415a16 16 0 1 0 0 32M390 445a16 16 0 1 0 0 32',
      'M634 415a16 16 0 1 0 0 32M634 445a16 16 0 1 0 0 32'
    ]
  },
  {
    id: 'koala',
    title: 'コアラ',
    parts: [
      { id: 'ears', d: `${circle(350, 240, 65)} ${circle(674, 240, 65)}` },
      { id: 'head', d: circle(512, 320, 150) },
      { id: 'tree', d: pill(700, 50, 110, 640, 40) },
      { id: 'body', d: pill(392, 460, 270, 190, 70) },
      { id: 'ground', d: hill(660, 680) }
    ],
    lines: [
      'M482 310a30 45 0 1 0 60 0a30 45 0 1 0 -60 0',
      'M430 280a12 12 0 1 1 0 -0.1M594 280a12 12 0 1 1 0 -0.1',
      'M490 380q22 18 44 0',
      'M720 200l40 -30M730 400l40 -30M720 550l40 -30'
    ]
  },
  {
    id: 'monkey',
    title: 'さる',
    parts: [
      { id: 'ears', d: `${circle(340, 300, 55)} ${circle(684, 300, 55)}` },
      { id: 'head', d: circle(512, 330, 150) },
      { id: 'body', d: pill(392, 470, 240, 180, 65) },
      { id: 'banana', d: 'M660 480C750 480 790 400 770 330C755 350 710 400 640 430Z' },
      { id: 'ground', d: hill(640, 660) }
    ],
    lines: [
      ...eyesSmile(512, 330, 50, 14, 40, 22),
      'M420 280C420 230 470 230 512 270C554 230 604 230 604 280C604 360 420 360 420 280Z',
      'M620 540C680 620 740 600 720 530C700 480 660 520 630 510',
      'M655 450l110 -115'
    ]
  },
  {
    id: 'penguin',
    title: 'ペンギン',
    parts: [
      { id: 'head', d: circle(512, 270, 130) },
      { id: 'body', d: pill(402, 390, 220, 240, 80) },
      { id: 'belly', d: pill(442, 430, 140, 180, 60) },
      { id: 'ice', d: poly(100, 680, 924, 520, 1024, 768, 0, 768) },
      { id: 'ground', d: hill(680, 700) }
    ],
    lines: [
      ...eyesSmile(512, 260, 45, 12, 28, 14),
      'M494 285l18 20l18 -20Z',
      'M390 430C360 480 370 540 410 550',
      'M634 430C664 480 654 540 614 550'
    ]
  },
  {
    id: 'dolphin',
    title: 'イルカ',
    parts: [
      { id: 'body', d: 'M260 490C360 280 660 260 820 440C720 420 540 420 420 520Z' },
      { id: 'tail', d: 'M260 490L160 430L190 490L150 550Z' },
      { id: 'fin', d: 'M510 320C520 220 580 230 580 290Z' },
      { id: 'waves', d: 'M0 580Q256 520 512 580T1024 580V768H0Z' },
      { id: 'splash', d: `${circle(320, 520, 25)} ${circle(740, 530, 20)}` }
    ],
    lines: [
      'M760 410a12 12 0 1 1 -0.1 0',
      'M740 435q20 15 40 0',
      'M560 410C550 460 590 480 610 440'
    ]
  },
  {
    id: 'bear',
    title: 'くま',
    parts: [
      { id: 'ears', d: `${circle(380, 200, 50)} ${circle(644, 200, 50)}` },
      { id: 'head', d: circle(512, 320, 155) },
      { id: 'body', d: pill(362, 465, 300, 195, 75) },
      { id: 'fish', d: ellipse(512, 470, 90, 42) },
      { id: 'ground', d: hill(650, 670) }
    ],
    lines: [
      ...eyesSmile(512, 310, 60, 14, 38, 20),
      'M494 340a18 12 0 1 0 36 0a18 12 0 1 0 -36 0',
      'M440 470a8 8 0 1 1 -0.1 0',
      'M580 470l30 -20v40Z'
    ]
  },
  {
    id: 'fox',
    title: 'きつね',
    parts: [
      { id: 'ears', d: `${poly(350, 240, 360, 90, 460, 190)} ${poly(674, 240, 664, 90, 564, 190)}` },
      { id: 'head', d: circle(512, 320, 150) },
      { id: 'body', d: pill(402, 460, 220, 190, 70) },
      { id: 'tail', d: 'M620 520C780 440 890 520 860 620C800 690 680 640 620 580Z' },
      { id: 'ground', d: hill(650, 670) }
    ],
    lines: [
      ...eyesSmile(512, 320, 55, 12, 34, 16),
      'M502 345l10 12l10 -12Z',
      'M440 330C450 380 480 400 512 400C544 400 574 380 584 330',
      'M760 510q30 20 60 10'
    ]
  },
  {
    id: 'frog',
    title: 'かえる',
    parts: [
      { id: 'eyesL', d: circle(400, 210, 50) },
      { id: 'eyesR', d: circle(624, 210, 50) },
      { id: 'head', d: ellipse(512, 320, 180, 130) },
      { id: 'body', d: pill(392, 440, 240, 180, 70) },
      { id: 'leaf', d: 'M650 360C620 200 800 160 880 260C850 340 730 370 650 360Z' },
      { id: 'ground', d: hill(640, 660) }
    ],
    lines: [
      'M400 210a14 14 0 1 1 -0.1 0M624 210a14 14 0 1 1 -0.1 0',
      'M390 340Q512 420 634 340',
      'M750 240l-30 80M750 240q40 20 70 0M750 240q-40 20 -70 0'
    ]
  },
  {
    id: 'turtle',
    title: 'かめ',
    parts: [
      { id: 'shell', d: 'M320 480C320 280 704 280 704 480Z' },
      { id: 'head', d: circle(760, 430, 60) },
      { id: 'legs', d: `${pill(280, 470, 70, 60, 25)} ${pill(420, 470, 70, 60, 25)} ${pill(640, 470, 70, 60, 25)}` },
      { id: 'rock', d: 'M160 540C340 500 680 500 880 550L920 680H120Z' },
      { id: 'sun', d: circle(880, 140, 60) }
    ],
    lines: [
      'M775 420a10 10 0 1 1 -0.1 0',
      'M760 450q15 12 30 0',
      'M400 420h220M450 350l120 0M420 480l40 -60M500 480l20 -60M580 480l-20 -60'
    ]
  },
  {
    id: 'squirrel',
    title: 'リス',
    parts: [
      { id: 'ears', d: poly(350, 250, 360, 150, 430, 230) },
      { id: 'head', d: circle(430, 340, 135) },
      { id: 'body', d: pill(360, 465, 200, 180, 65) },
      { id: 'tail', d: 'M550 560C680 560 860 480 840 280C800 160 690 190 690 260C690 340 800 360 760 490C720 550 630 560 550 560Z' },
      { id: 'acorn', d: pill(270, 430, 80, 100, 30) },
      { id: 'ground', d: hill(640, 660) }
    ],
    lines: [
      ...eyesSmile(430, 340, 45, 12, 30, 15),
      'M412 355l8 10l8 -10Z',
      'M260 430h100M280 410h60',
      'M720 300c-30 40 -10 100 20 140'
    ]
  },
  {
    id: 'hedgehog',
    title: 'ハリネズミ',
    parts: [
      { id: 'spikes', d: scallopDonut(480, 440, 230, 120, 12) },
      { id: 'face', d: circle(480, 440, 118) },
      { id: 'flower', d: circle(730, 320, 40) },
      { id: 'ground', d: hill(650, 670) }
    ],
    lines: [
      ...eyesSmile(480, 440, 40, 10, 26, 12),
      'M472 455l8 10l8 -10Z',
      'M730 360v60M710 390q20 -10 40 0'
    ]
  },
  {
    id: 'owl',
    title: 'ふくろう',
    parts: [
      { id: 'head', d: circle(512, 300, 160) },
      { id: 'body', d: pill(392, 450, 240, 190, 70) },
      { id: 'wingL', d: pill(290, 390, 95, 170, 40) },
      { id: 'wingR', d: pill(639, 390, 95, 170, 40) },
      { id: 'branch', d: pill(150, 620, 724, 45, 20) },
      { id: 'moon', d: circle(850, 140, 60) }
    ],
    lines: [
      'M445 285a26 26 0 1 1 0 -0.1M579 285a26 26 0 1 1 0 -0.1',
      'M445 285a12 12 0 1 0 0.1 0M579 285a12 12 0 1 0 0.1 0',
      'M502 320l10 18l10 -18Z',
      'M460 500q15 15 30 0M510 500q15 15 30 0M485 540q15 15 30 0'
    ]
  },
  {
    id: 'alpaca',
    title: 'アルパカ',
    parts: [
      { id: 'fluff', d: wavyPuff(512, 180, 190, 140) },
      { id: 'face', d: circle(512, 280, 95) },
      { id: 'neck', d: pill(462, 360, 100, 180, 45) },
      { id: 'body', d: wavyPuff(460, 520, 360, 200) },
      { id: 'ground', d: hill(650, 670) }
    ],
    lines: [
      ...eyesSmile(512, 280, 32, 10, 24, 12),
      'M430 180q-20 -20 0 -40M594 180q20 -20 0 -40'
    ]
  },
  {
    id: 'capybara',
    title: 'カピバラ',
    parts: [
      { id: 'head', d: pill(330, 360, 260, 160, 60) },
      { id: 'body', d: pill(520, 380, 320, 220, 80) },
      { id: 'yuzu', d: circle(450, 300, 38) },
      { id: 'tub', d: 'M180 560C180 530 844 530 844 560L810 680H214Z' },
      { id: 'ground', d: hill(670, 690) }
    ],
    lines: [
      'M400 420h30M500 420h30',
      'M340 440q10 10 20 0',
      'M450 265q-15 -15 0 -30',
      'M300 500q10 -30 20 0M700 480q10 -30 20 0'
    ]
  }
];

// Helper to create vehicles with non-overlapping parts
function makeVehicle(id, title, parts, lines) {
  return { id, title, parts, lines };
}

const vehicles = [
  makeVehicle('police_car', 'パトカー', [
    { id: 'siren', d: circle(512, 230, 30) },
    { id: 'cabin', d: pill(350, 260, 324, 140, 50) },
    { id: 'body', d: pill(180, 390, 664, 190, 50) },
    { id: 'wheels', d: `${circle(330, 580, 70)} ${circle(694, 580, 70)}` },
    { id: 'road', d: hill(640, 650) }
  ], [
    'M370 290h110v80h-110ZM540 290h110v80h-110Z',
    'M180 470h664',
    'M330 580a25 25 0 1 0 0.1 0M694 580a25 25 0 1 0 0.1 0',
    'M480 510q32 20 64 0'
  ]),
  makeVehicle('fire_engine', 'しょうぼうしゃ', [
    { id: 'ladder', d: pill(360, 210, 340, 45, 12) },
    { id: 'cabin', d: pill(560, 260, 260, 160, 30) },
    { id: 'body', d: pill(180, 380, 664, 200, 40) },
    { id: 'wheels', d: `${circle(310, 580, 65)} ${circle(512, 580, 65)} ${circle(714, 580, 65)}` },
    { id: 'road', d: hill(640, 650) }
  ], [
    'M400 232h260M430 210v45M490 210v45M550 210v45M610 210v45',
    'M610 300h150v70h-150Z',
    'M180 480h664'
  ]),
  makeVehicle('ambulance', 'きゅうきゅうしゃ', [
    { id: 'siren', d: pill(480, 230, 64, 30, 10) },
    { id: 'cabin', d: pill(540, 260, 260, 160, 30) },
    { id: 'body', d: pill(200, 360, 624, 220, 40) },
    { id: 'wheels', d: `${circle(330, 580, 65)} ${circle(694, 580, 65)}` },
    { id: 'road', d: hill(640, 650) }
  ], [
    'M590 300h160v70h-160Z',
    'M360 440h60M390 410v60', // 赤十字
    'M330 580a25 25 0 1 0 0.1 0M694 580a25 25 0 1 0 0.1 0'
  ]),
  makeVehicle('train', 'きしゃ', [
    { id: 'smoke', d: `${circle(430, 170, 35)} ${circle(480, 120, 45)} ${circle(550, 80, 55)}` },
    { id: 'chimney', d: pill(390, 240, 60, 90, 10) },
    { id: 'boiler', d: pill(320, 330, 260, 220, 40) },
    { id: 'cab', d: pill(580, 250, 220, 300, 30) },
    { id: 'wheels', d: `${circle(370, 580, 65)} ${circle(512, 580, 65)} ${circle(670, 580, 75)}` },
    { id: 'rail', d: hill(640, 650) }
  ], [
    'M620 290h140v90h-140Z',
    'M340 440a20 20 0 1 0 40 0a20 20 0 1 0 -40 0',
    'M370 580l142 0'
  ]),
  makeVehicle('shinkansen', 'しんかんせん', [
    { id: 'nose', d: 'M180 500C260 380 400 330 600 330L780 330L780 500Z' },
    { id: 'body', d: pill(220, 500, 580, 90, 15) },
    { id: 'rail', d: hill(590, 600) },
    { id: 'clouds', d: wavyPuff(800, 180, 240, 110) }
  ], [
    'M480 370h60v40h-60ZM570 370h60v40h-60ZM660 370h60v40h-60Z',
    'M220 460h560',
    'M280 430a15 15 0 1 0 30 0a15 15 0 1 0 -30 0'
  ]),
  makeVehicle('bus', 'バス', [
    { id: 'roof', d: pill(200, 200, 624, 70, 25) },
    { id: 'windows', d: pill(220, 270, 584, 130, 20) },
    { id: 'body', d: pill(200, 400, 624, 180, 30) },
    { id: 'wheels', d: `${circle(340, 580, 65)} ${circle(684, 580, 65)}` },
    { id: 'road', d: hill(640, 650) }
  ], [
    'M260 290h80v90h-80ZM380 290h80v90h-80ZM500 290h80v90h-80ZM620 290h140v90h-140Z',
    'M230 460a18 18 0 1 0 36 0a18 18 0 1 0 -36 0',
    'M460 480q52 25 104 0'
  ]),
  makeVehicle('taxi', 'タクシー', [
    { id: 'sign', d: pill(460, 230, 104, 35, 12) },
    { id: 'cabin', d: pill(340, 265, 344, 135, 45) },
    { id: 'body', d: pill(180, 400, 664, 180, 50) },
    { id: 'wheels', d: `${circle(330, 580, 65)} ${circle(694, 580, 65)}` },
    { id: 'road', d: hill(640, 650) }
  ], [
    'M360 295h120v80h-120ZM520 295h120v80h-120Z',
    'M180 470h664',
    'M470 510q42 20 84 0'
  ]),
  makeVehicle('truck', 'トラック', [
    { id: 'cab', d: pill(560, 280, 260, 140, 30) },
    { id: 'cargo', d: pill(180, 230, 380, 260, 25) },
    { id: 'chassis', d: pill(180, 480, 640, 90, 20) },
    { id: 'wheels', d: `${circle(300, 570, 65)} ${circle(460, 570, 65)} ${circle(720, 570, 65)}` },
    { id: 'road', d: hill(630, 640) }
  ], [
    'M620 310h160v70h-160Z',
    'M220 280h300M220 350h300M220 420h300'
  ]),
  makeVehicle('excavator', 'ショベルカー', [
    { id: 'cab', d: pill(420, 280, 240, 180, 30) },
    { id: 'arm', d: poly(420, 350, 260, 200, 210, 240, 360, 410) },
    { id: 'bucket', d: pill(150, 210, 90, 80, 20) },
    { id: 'treads', d: pill(350, 500, 380, 90, 40) },
    { id: 'dirt', d: hill(590, 610) }
  ], [
    'M480 320h140v80h-140Z',
    'M400 545a25 25 0 1 0 50 0a25 25 0 1 0 -50 0M515 545a25 25 0 1 0 50 0a25 25 0 1 0 -50 0M630 545a25 25 0 1 0 50 0a25 25 0 1 0 -50 0'
  ]),
  makeVehicle('crane', 'クレーンしゃ', [
    { id: 'arm', d: poly(320, 420, 680, 120, 720, 160, 360, 460) },
    { id: 'cargo', d: pill(690, 250, 90, 90, 15) },
    { id: 'body', d: pill(220, 440, 584, 140, 30) },
    { id: 'wheels', d: `${circle(330, 580, 65)} ${circle(694, 580, 65)}` },
    { id: 'road', d: hill(640, 650) }
  ], [
    'M700 140v110',
    'M580 470h160v60h-160Z',
    'M420 380l40 -40M480 330l40 -40M540 280l40 -40'
  ]),
  makeVehicle('airplane', 'ひこうき', [
    { id: 'body', d: 'M180 380C340 300 700 300 860 380C700 460 340 460 180 380Z' },
    { id: 'wingT', d: poly(460, 340, 540, 140, 620, 160, 570, 340) },
    { id: 'wingB', d: poly(460, 420, 540, 620, 620, 600, 570, 420) },
    { id: 'tail', d: poly(180, 380, 220, 240, 270, 260, 250, 380) },
    { id: 'clouds', d: wavyPuff(800, 560, 260, 120) }
  ], [
    'M780 370a14 14 0 1 0 28 0a14 14 0 1 0 -28 0',
    'M600 370a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M520 370a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M440 370a10 10 0 1 0 20 0a10 10 0 1 0 -20 0'
  ]),
  makeVehicle('helicopter', 'ヘリコプター', [
    { id: 'rotor', d: pill(240, 160, 544, 25, 10) },
    { id: 'cabin', d: pill(380, 240, 300, 220, 80) },
    { id: 'tail', d: pill(180, 320, 220, 45, 15) },
    { id: 'skids', d: pill(340, 520, 380, 25, 10) },
    { id: 'clouds', d: wavyPuff(800, 480, 240, 110) }
  ], [
    'M512 185v55',
    'M520 270h130v110h-130Z',
    'M430 460l-30 60M630 460l30 60'
  ]),
  makeVehicle('cruise_ship', 'ふね', [
    { id: 'funnel', d: pill(470, 150, 84, 80, 15) },
    { id: 'cabin', d: pill(300, 230, 424, 160, 25) },
    { id: 'hull', d: 'M160 390H864L760 580H264Z' },
    { id: 'waves', d: 'M0 580Q256 520 512 580T1024 580V768H0Z' },
    { id: 'cloud', d: wavyPuff(820, 160, 200, 90) }
  ], [
    'M340 260a12 12 0 1 0 24 0a12 12 0 1 0 -24 0M410 260a12 12 0 1 0 24 0a12 12 0 1 0 -24 0M480 260a12 12 0 1 0 24 0a12 12 0 1 0 -24 0M550 260a12 12 0 1 0 24 0a12 12 0 1 0 -24 0M620 260a12 12 0 1 0 24 0a12 12 0 1 0 -24 0',
    'M240 450a14 14 0 1 0 28 0a14 14 0 1 0 -28 0M320 450a14 14 0 1 0 28 0a14 14 0 1 0 -28 0M400 450a14 14 0 1 0 28 0a14 14 0 1 0 -28 0M480 450a14 14 0 1 0 28 0a14 14 0 1 0 -28 0M560 450a14 14 0 1 0 28 0a14 14 0 1 0 -28 0M640 450a14 14 0 1 0 28 0a14 14 0 1 0 -28 0'
  ]),
  makeVehicle('yacht', 'ヨット', [
    { id: 'sailBig', d: poly(512, 120, 512, 470, 260, 470) },
    { id: 'sailSmall', d: poly(530, 160, 740, 470, 530, 470) },
    { id: 'hull', d: 'M220 500H804L720 600H304Z' },
    { id: 'waves', d: 'M0 600Q256 550 512 600T1024 600V768H0Z' },
    { id: 'sun', d: circle(860, 140, 60) }
  ], [
    'M520 100v400',
    'M250 530h520'
  ]),
  makeVehicle('rocket', 'ロケット', [
    { id: 'nose', d: poly(512, 90, 430, 260, 594, 260) },
    { id: 'body', d: pill(430, 260, 164, 300, 30) },
    { id: 'finL', d: poly(430, 420, 330, 560, 430, 560) },
    { id: 'finR', d: poly(594, 420, 694, 560, 594, 560) },
    { id: 'flame', d: poly(460, 560, 512, 700, 564, 560) },
    { id: 'stars', d: `${star(200, 180, 36, 16)} ${star(820, 220, 40, 18)}` }
  ], [
    'M512 360a35 35 0 1 0 0.1 0',
    'M512 360a20 20 0 1 0 0.1 0',
    'M430 480h164'
  ]),
  makeVehicle('bicycle', 'じてんしゃ', [
    { id: 'basket', d: pill(640, 280, 100, 80, 20) },
    { id: 'seat', d: pill(350, 320, 90, 30, 10) },
    { id: 'wheels', d: `${circle(310, 540, 85)} ${circle(714, 540, 85)}` },
    { id: 'road', d: hill(625, 635) },
    { id: 'cloud', d: wavyPuff(512, 140, 240, 100) }
  ], [
    'M310 540L420 340L560 540L310 540',
    'M420 340L650 340L714 540',
    'M310 540a35 35 0 1 0 0.1 0M714 540a35 35 0 1 0 0.1 0'
  ]),
  makeVehicle('motorcycle', 'バイク', [
    { id: 'tank', d: pill(440, 320, 160, 90, 35) },
    { id: 'seat', d: pill(330, 350, 120, 40, 15) },
    { id: 'body', d: pill(390, 410, 240, 120, 30) },
    { id: 'wheels', d: `${circle(280, 540, 80)} ${circle(744, 540, 80)}` },
    { id: 'road', d: hill(620, 630) }
  ], [
    'M280 540a35 35 0 1 0 0.1 0M744 540a35 35 0 1 0 0.1 0',
    'M580 340L680 260M670 260h40',
    'M350 490h260'
  ]),
  makeVehicle('hot_air_balloon', 'ききゅう', [
    { id: 'balloon', d: 'M512 100C340 100 320 340 440 450H584C704 340 684 100 512 100Z' },
    { id: 'basket', d: pill(460, 510, 104, 85, 20) },
    { id: 'cloudsL', d: wavyPuff(220, 320, 220, 110) },
    { id: 'cloudsR', d: wavyPuff(800, 380, 240, 110) },
    { id: 'sun', d: circle(860, 140, 55) }
  ], [
    'M460 450L475 510M564 450L549 510',
    'M512 100v350M420 180C470 260 470 380 440 450M604 180C554 260 554 380 584 450'
  ]),
  makeVehicle('submarine', 'せんすいかん', [
    { id: 'scope', d: poly(490, 170, 550, 170, 550, 260, 490, 260) },
    { id: 'hull', d: ellipse(512, 420, 320, 160) },
    { id: 'propeller', d: `${pill(160, 350, 40, 60, 15)} ${pill(160, 430, 40, 60, 15)}` },
    { id: 'bubbles', d: `${circle(860, 240, 24)} ${circle(890, 180, 18)} ${circle(820, 130, 14)}` },
    { id: 'seaFloor', d: hill(640, 650) }
  ], [
    'M400 420a30 30 0 1 0 60 0a30 30 0 1 0 -60 0',
    'M520 420a30 30 0 1 0 60 0a30 30 0 1 0 -60 0',
    'M640 420a30 30 0 1 0 60 0a30 30 0 1 0 -60 0'
  ]),
  makeVehicle('ufo', 'UFO', [
    { id: 'dome', d: 'M380 320C380 200 644 200 644 320Z' },
    { id: 'hull', d: ellipse(512, 360, 340, 80) },
    { id: 'beam', d: poly(390, 400, 634, 400, 720, 670, 304, 670) },
    { id: 'stars', d: `${star(200, 160, 32, 14)} ${star(820, 180, 36, 16)}` },
    { id: 'ground', d: hill(670, 680) }
  ], [
    'M512 280a22 22 0 1 0 0.1 0', // うちゅうじんの頭
    'M495 270a4 4 0 1 0 0.1 0M529 270a4 4 0 1 0 0.1 0',
    'M280 360a16 16 0 1 0 32 0a16 16 0 1 0 -32 0M410 375a16 16 0 1 0 32 0a16 16 0 1 0 -32 0M582 375a16 16 0 1 0 32 0a16 16 0 1 0 -32 0M712 360a16 16 0 1 0 32 0a16 16 0 1 0 -32 0'
  ])
];

// Helper to create character artworks
function makeChar(id, title, parts, lines) {
  return { id, title, parts, lines };
}

const characters = [
  makeChar('magical_girl', 'まほうしょうじょ', [
    { id: 'hair', d: wavyPuff(512, 240, 320, 240) },
    { id: 'face', d: circle(512, 280, 95) },
    { id: 'dress', d: poly(450, 375, 574, 375, 660, 610, 364, 610) },
    { id: 'wand', d: pill(690, 260, 30, 320, 12) },
    { id: 'starWand', d: star(705, 230, 48, 22) },
    { id: 'ground', d: hill(640, 660) }
  ], [
    ...eyesSmile(512, 280, 36, 12, 28, 14),
    'M450 440q62 25 124 0M420 520q92 30 184 0'
  ]),
  makeChar('brave_boy', 'ゆうしゃ', [
    { id: 'hair', d: wavyPuff(512, 220, 280, 180) },
    { id: 'face', d: circle(512, 280, 90) },
    { id: 'cape', d: poly(390, 370, 634, 370, 680, 610, 344, 610) },
    { id: 'shield', d: pill(310, 380, 110, 160, 35) },
    { id: 'sword', d: pill(670, 320, 30, 260, 10) },
    { id: 'ground', d: hill(640, 660) }
  ], [
    ...eyesSmile(512, 280, 34, 12, 26, 12),
    'M365 460a22 22 0 1 0 0.1 0',
    'M650 380h70'
  ]),
  makeChar('robot', 'ロボット', [
    { id: 'antenna', d: pill(497, 100, 30, 80, 10) },
    { id: 'head', d: pill(372, 170, 280, 190, 40) },
    { id: 'chest', d: pill(352, 380, 320, 220, 35) },
    { id: 'armL', d: pill(250, 400, 80, 150, 30) },
    { id: 'armR', d: pill(694, 400, 80, 150, 30) },
    { id: 'ground', d: hill(630, 650) }
  ], [
    'M445 250a22 22 0 1 0 0.1 0M579 250a22 22 0 1 0 0.1 0',
    'M460 310h104',
    'M420 440h184v100h-184Z',
    'M460 490a15 15 0 1 0 30 0a15 15 0 1 0 -30 0M534 490a15 15 0 1 0 30 0a15 15 0 1 0 -30 0'
  ]),
  makeChar('fairy', 'ようせい', [
    { id: 'wingL', d: ellipse(360, 350, 130, 180) },
    { id: 'wingR', d: ellipse(664, 350, 130, 180) },
    { id: 'head', d: circle(512, 280, 85) },
    { id: 'dress', d: poly(460, 365, 564, 365, 620, 560, 404, 560) },
    { id: 'flower', d: circle(512, 650, 90) }
  ], [
    ...eyesSmile(512, 280, 30, 10, 24, 12),
    'M360 350q40 40 80 0M664 350q-40 40 -80 0'
  ]),
  makeChar('ninja', 'にんじゃ', [
    { id: 'hood', d: circle(512, 280, 130) },
    { id: 'body', d: pill(392, 410, 240, 200, 50) },
    { id: 'shuriken', d: star(730, 380, 55, 20, 4) },
    { id: 'smoke', d: wavyPuff(300, 540, 220, 120) },
    { id: 'ground', d: hill(640, 660) }
  ], [
    'M440 280h144v45h-144Z', // 目出し
    'M475 302a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M533 302a8 8 0 1 0 16 0a8 8 0 1 0 -16 0',
    'M450 490l62 40l62 -40'
  ]),
  makeChar('princess', 'おひめさま', [
    { id: 'tiara', d: poly(460, 160, 480, 120, 512, 150, 544, 120, 564, 160) },
    { id: 'hair', d: wavyPuff(512, 250, 330, 240) },
    { id: 'face', d: circle(512, 280, 95) },
    { id: 'skirt', d: 'M450 375H574C720 540 760 620 720 660H304C264 620 304 540 450 375Z' },
    { id: 'ground', d: hill(660, 670) }
  ], [
    ...eyesSmile(512, 280, 34, 12, 28, 14),
    'M370 540q142 40 284 0M340 600q172 40 344 0'
  ]),
  makeChar('prince', 'おうじさま', [
    { id: 'crown', d: poly(460, 150, 475, 110, 512, 140, 549, 110, 564, 150) },
    { id: 'face', d: circle(512, 270, 95) },
    { id: 'cape', d: poly(390, 360, 634, 360, 670, 610, 354, 610) },
    { id: 'tunic', d: pill(442, 365, 140, 220, 30) },
    { id: 'ground', d: hill(640, 660) }
  ], [
    ...eyesSmile(512, 270, 34, 12, 26, 12),
    'M512 400v140M470 440h84'
  ]),
  makeChar('alien', 'うちゅうじん', [
    { id: 'antennas', d: `${pill(430, 120, 25, 90, 10)} ${pill(569, 120, 25, 90, 10)}` },
    { id: 'head', d: ellipse(512, 290, 170, 130) },
    { id: 'body', d: pill(412, 420, 200, 180, 60) },
    { id: 'planet', d: circle(790, 200, 65) },
    { id: 'ground', d: hill(630, 650) }
  ], [
    'M440 290a16 16 0 1 0 32 0a16 16 0 1 0 -32 0M496 280a16 16 0 1 0 32 0a16 16 0 1 0 -32 0M552 290a16 16 0 1 0 32 0a16 16 0 1 0 -32 0',
    'M475 350q37 20 74 0',
    'M710 200q80 -30 160 0'
  ]),
  makeChar('monster', 'モンスター', [
    { id: 'horns', d: `${poly(360, 250, 330, 140, 420, 210)} ${poly(664, 250, 694, 140, 604, 210)}` },
    { id: 'body', d: pill(342, 240, 340, 360, 110) },
    { id: 'feet', d: `${circle(410, 620, 45)} ${circle(614, 620, 45)}` },
    { id: 'ground', d: hill(640, 660) }
  ], [
    'M512 340a45 45 0 1 0 0.1 0', // ひとつめ
    'M512 340a20 20 0 1 0 0.1 0',
    'M440 440Q512 520 584 440Z', // 大きなお口
    'M480 440v20M512 440v20M544 440v20'
  ]),
  makeChar('explorer', 'たんけんか', [
    { id: 'hat', d: pill(352, 170, 320, 80, 25) },
    { id: 'face', d: circle(512, 290, 95) },
    { id: 'body', d: pill(412, 385, 200, 220, 40) },
    { id: 'glass', d: circle(710, 380, 75) },
    { id: 'ground', d: hill(640, 660) }
  ], [
    ...eyesSmile(512, 290, 34, 12, 28, 14),
    'M710 455l40 80',
    'M450 450h124M470 510h84'
  ]),
  makeChar('pirate', 'かいぞく', [
    { id: 'hat', d: poly(330, 240, 512, 110, 694, 240) },
    { id: 'face', d: circle(512, 290, 95) },
    { id: 'body', d: pill(402, 385, 220, 210, 45) },
    { id: 'chest', d: pill(670, 470, 160, 120, 25) },
    { id: 'ground', d: hill(640, 660) }
  ], [
    'M460 280a14 14 0 1 0 28 0a14 14 0 1 0 -28 0', // 目
    'M550 270l25 25M575 270l-25 25', // 眼帯
    'M490 330q22 18 44 0',
    'M512 170a16 16 0 1 0 0.1 0', // ドクロマーク
    'M670 520h160'
  ]),
  makeChar('hero', 'ヒーロー', [
    { id: 'cape', d: poly(340, 340, 684, 340, 740, 620, 284, 620) },
    { id: 'head', d: circle(512, 260, 95) },
    { id: 'suit', d: pill(412, 355, 200, 240, 45) },
    { id: 'buildings', d: `${pill(150, 460, 110, 240, 10)} ${pill(764, 420, 120, 280, 10)}` },
    { id: 'ground', d: hill(650, 670) }
  ], [
    'M450 250h124v30h-124Z', // アイマスク
    'M475 265a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M537 265a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
    'M495 310q17 14 34 0',
    'M512 420l25 35h-50Z'
  ]),
  makeChar('idol', 'アイドル', [
    { id: 'bow', d: `${poly(450, 140, 512, 170, 450, 200)} ${poly(574, 140, 512, 170, 574, 200)}` },
    { id: 'hair', d: wavyPuff(512, 240, 320, 220) },
    { id: 'face', d: circle(512, 270, 90) },
    { id: 'dress', d: 'M450 360H574C680 490 710 590 670 610H354C314 590 344 490 450 360Z' },
    { id: 'mic', d: pill(670, 380, 35, 120, 12) },
    { id: 'ground', d: hill(640, 660) }
  ], [
    ...eyesSmile(512, 270, 32, 12, 28, 14),
    'M687 370a22 22 0 1 0 0.1 0', // マイク頭
    'M400 480q112 30 224 0M370 540q142 30 284 0'
  ]),
  makeChar('ghost', 'おばけ', [
    { id: 'body', d: 'M340 580C340 260 684 260 684 580Q640 540 600 580Q556 540 512 580Q468 540 424 580Q382 540 340 580Z' },
    { id: 'moon', d: circle(820, 160, 65) },
    { id: 'star1', d: star(220, 220, 36, 16) },
    { id: 'star2', d: star(300, 140, 28, 12) },
    { id: 'ground', d: hill(650, 670) }
  ], [
    'M445 360a16 22 0 1 0 32 0a16 22 0 1 0 -32 0M547 360a16 22 0 1 0 32 0a16 22 0 1 0 -32 0',
    'M480 430Q512 490 544 430Z',
    'M512 460v25' // 舌出し
  ]),
  makeChar('dino', 'きょうりゅう', [
    { id: 'dinoHead', d: circle(512, 260, 130) },
    { id: 'eggShell', d: 'M340 430C340 630 684 630 684 430L620 470L560 420L512 480L460 420L400 470Z' },
    { id: 'eggBottom', d: pill(362, 580, 300, 70, 30) },
    { id: 'nest', d: hill(640, 660) }
  ], [
    ...eyesSmile(512, 250, 45, 12, 32, 16),
    'M420 200q15 -25 30 0M512 180q15 -25 30 0M604 200q15 -25 30 0',
    'M420 540q92 30 184 0'
  ]),
  makeChar('dragon', 'ドラゴン', [
    { id: 'horns', d: `${poly(410, 190, 360, 90, 460, 150)} ${poly(614, 190, 664, 90, 564, 150)}` },
    { id: 'head', d: circle(512, 270, 135) },
    { id: 'body', d: pill(382, 405, 260, 215, 75) },
    { id: 'wings', d: `${poly(380, 430, 240, 320, 360, 520)} ${poly(644, 430, 784, 320, 664, 520)}` },
    { id: 'fire', d: poly(660, 280, 820, 220, 760, 320) },
    { id: 'ground', d: hill(640, 660) }
  ], [
    ...eyesSmile(512, 260, 42, 12, 34, 16),
    'M490 290h44',
    'M440 470q72 30 144 0M440 530q72 30 144 0'
  ]),
  makeChar('unicorn', 'ユニコーン', [
    { id: 'horn', d: poly(512, 80, 490, 220, 534, 220) },
    { id: 'mane', d: wavyPuff(390, 260, 160, 260) },
    { id: 'head', d: circle(512, 280, 125) },
    { id: 'body', d: pill(422, 405, 240, 205, 70) },
    { id: 'rainbow', d: hill(620, 650) }
  ], [
    'M540 270a14 14 0 1 1 -0.1 0',
    'M560 330q18 12 36 0',
    'M500 130l24 15M495 170l29 15'
  ]),
  makeChar('ninja_dog', 'にんじゃいぬ', [
    { id: 'ears', d: `${poly(360, 220, 380, 120, 450, 180)} ${poly(664, 220, 644, 120, 574, 180)}` },
    { id: 'head', d: circle(512, 280, 130) },
    { id: 'body', d: pill(392, 410, 240, 190, 60) },
    { id: 'scroll', d: pill(340, 460, 344, 45, 15) },
    { id: 'ground', d: hill(640, 660) }
  ], [
    'M440 270h144v45h-144Z',
    'M475 292a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M533 292a8 8 0 1 0 16 0a8 8 0 1 0 -16 0',
    'M360 482a15 15 0 1 0 0 0.1M664 482a15 15 0 1 0 0 0.1'
  ]),
  makeChar('angel', 'てんし', [
    { id: 'halo', d: ellipse(512, 130, 90, 25) },
    { id: 'head', d: circle(512, 250, 90) },
    { id: 'wings', d: `${ellipse(350, 360, 120, 160)} ${ellipse(674, 360, 120, 160)}` },
    { id: 'robe', d: poly(460, 340, 564, 340, 630, 580, 394, 580) },
    { id: 'cloud', d: wavyPuff(512, 640, 440, 140) }
  ], [
    ...eyesSmile(512, 250, 32, 10, 24, 12),
    'M470 420q42 20 84 0M450 490q62 25 124 0'
  ]),
  makeChar('witch', 'まじょ', [
    { id: 'hat', d: poly(320, 220, 512, 60, 704, 220) },
    { id: 'face', d: circle(512, 280, 95) },
    { id: 'cape', d: poly(420, 375, 604, 375, 660, 590, 364, 590) },
    { id: 'broom', d: pill(180, 520, 664, 30, 10) },
    { id: 'moon', d: circle(830, 140, 65) }
  ], [
    ...eyesSmile(512, 280, 34, 12, 26, 12),
    'M320 220q192 -20 384 0',
    'M220 480l-60 80h80Z' // ホウキの先
  ])
];

// Helper to create food artworks
function makeFood(id, title, parts, lines) {
  return { id, title, parts, lines };
}

const food = [
  makeFood('shortcake', 'ショートケーキ', [
    { id: 'strawberry', d: circle(512, 190, 45) },
    { id: 'creamTop', d: pill(320, 240, 384, 60, 25) },
    { id: 'cake', d: poly(320, 300, 704, 300, 740, 520, 284, 520) },
    { id: 'plate', d: ellipse(512, 570, 340, 65) },
    { id: 'table', d: hill(630, 640) }
  ], [
    'M320 410h420', // いちごクリーム層
    'M512 145q-15 -20 0 -35M512 145q15 -20 0 -35',
    'M480 190a4 4 0 1 0 0.1 0M530 190a4 4 0 1 0 0.1 0',
    ...eyesSmile(512, 460, 50, 10, 32, 14)
  ]),
  makeFood('hamburger', 'ハンバーガー', [
    { id: 'bunTop', d: 'M300 280C300 160 724 160 724 280Z' },
    { id: 'cheese', d: poly(310, 290, 714, 290, 740, 370, 512, 340, 284, 370) },
    { id: 'patty', d: pill(280, 370, 464, 75, 25) },
    { id: 'lettuce', d: wavyPuff(512, 465, 480, 65) },
    { id: 'bunBottom', d: pill(310, 500, 404, 85, 30) },
    { id: 'table', d: hill(620, 640) }
  ], [
    'M420 220a6 10 30 1 0 0.1 0M512 200a6 10 0 1 0 0.1 0M604 220a6 10 -30 1 0 0.1 0',
    ...eyesSmile(512, 410, 45, 10, 28, 12)
  ]),
  makeFood('omurice', 'オムライス', [
    { id: 'egg', d: ellipse(512, 380, 300, 160) },
    { id: 'ketchup', d: 'M512 370C470 320 470 280 500 280C515 280 512 295 512 305C512 295 509 280 524 280C554 280 554 320 512 370Z' },
    { id: 'plate', d: ellipse(512, 480, 380, 130) },
    { id: 'table', d: hill(630, 640) }
  ], [
    ...eyesSmile(512, 420, 60, 12, 36, 16),
    'M740 330q40 20 60 -10' // パセリ
  ]),
  makeFood('sushi', 'おすし', [
    { id: 'tuna', d: pill(250, 300, 240, 95, 35) },
    { id: 'eggTopping', d: pill(534, 300, 240, 95, 35) },
    { id: 'seaweed', d: pill(624, 290, 60, 180, 10) },
    { id: 'board', d: pill(160, 470, 704, 110, 20) },
    { id: 'table', d: hill(620, 630) }
  ], [
    'M280 340q50 -15 100 0M340 360q50 -15 100 0',
    'M290 420h160v60h-160Z', // シャリ
    'M570 420h160v60h-160Z',
    ...eyesSmile(370, 450, 30, 8, 20, 10),
    ...eyesSmile(650, 450, 30, 8, 20, 10)
  ]),
  makeFood('curry', 'カレーライス', [
    { id: 'curryRoux', d: ellipse(420, 420, 220, 120) },
    { id: 'rice', d: ellipse(620, 410, 190, 110) },
    { id: 'carrot', d: circle(400, 390, 30) },
    { id: 'potato', d: pill(460, 420, 60, 45, 15) },
    { id: 'plate', d: ellipse(512, 480, 380, 130) },
    { id: 'table', d: hill(630, 640) }
  ], [
    'M512 280q-15 -30 0 -60M560 280q-15 -30 0 -60', // 湯気
    ...eyesSmile(620, 410, 40, 10, 26, 12)
  ]),
  makeFood('pizza', 'ピザ', [
    { id: 'crust', d: 'M512 160L220 540C380 620 644 620 804 540Z' },
    { id: 'cheese', d: 'M512 200L260 520C390 580 634 580 764 520Z' },
    { id: 'pep1', d: circle(460, 380, 35) },
    { id: 'pep2', d: circle(570, 430, 35) },
    { id: 'table', d: hill(630, 650) }
  ], [
    ...eyesSmile(512, 480, 45, 10, 28, 12),
    'M320 540q40 20 80 0M460 550q40 20 80 0M600 540q40 20 80 0'
  ]),
  makeFood('pudding', 'プリン', [
    { id: 'cherry', d: circle(512, 180, 35) },
    { id: 'caramel', d: pill(370, 230, 284, 80, 30) },
    { id: 'puddingBody', d: poly(370, 310, 654, 310, 694, 500, 330, 500) },
    { id: 'dish', d: ellipse(512, 530, 300, 60) },
    { id: 'table', d: hill(620, 640) }
  ], [
    'M512 145q20 -30 40 -20', // さくらんぼの軸
    ...eyesSmile(512, 420, 50, 12, 34, 16),
    'M400 310c10 40 30 40 40 0M480 310c10 50 30 50 40 0M560 310c10 40 30 40 40 0'
  ]),
  makeFood('icecream', 'アイスクリーム', [
    { id: 'cherry', d: circle(512, 100, 30) },
    { id: 'scoop3', d: circle(512, 190, 75) },
    { id: 'scoop2', d: circle(512, 310, 95) },
    { id: 'scoop1', d: circle(512, 440, 115) },
    { id: 'cone', d: poly(410, 510, 614, 510, 512, 730) }
  ], [
    'M440 560l140 100M480 530l100 120M584 560l-140 100M544 530l-100 120',
    ...eyesSmile(512, 440, 40, 10, 26, 12),
    ...eyesSmile(512, 310, 34, 9, 22, 10)
  ]),
  makeFood('donut', 'ドーナツ', [
    { id: 'frosting', d: scallopDonut(512, 380, 220, 90, 12) },
    { id: 'hole', d: circle(512, 380, 88) },
    { id: 'cup', d: pill(780, 320, 110, 140, 20) },
    { id: 'table', d: hill(620, 640) }
  ], [
    ...eyesSmile(512, 450, 55, 12, 32, 14),
    'M420 300a6 15 45 1 0 0.1 0M560 270a6 15 -30 1 0 0.1 0M620 370a6 15 60 1 0 0.1 0M380 430a6 15 -45 1 0 0.1 0',
    'M890 360a25 35 0 1 0 0 70' // マグカップの取っ手
  ]),
  makeFood('parfait', 'パフェ', [
    { id: 'cherry', d: circle(512, 140, 32) },
    { id: 'cream', d: wavyPuff(512, 230, 260, 120) },
    { id: 'glass', d: poly(390, 300, 634, 300, 574, 540, 450, 540) },
    { id: 'stem', d: pill(492, 540, 40, 90, 10) },
    { id: 'base', d: ellipse(512, 640, 130, 30) },
    { id: 'table', d: hill(640, 650) }
  ], [
    'M390 380h244M390 460h244',
    ...eyesSmile(512, 420, 45, 10, 26, 12)
  ]),
  makeFood('onigiri', 'おにぎり', [
    { id: 'rice', d: pill(330, 250, 364, 340, 110) },
    { id: 'seaweed', d: pill(422, 440, 180, 150, 25) },
    { id: 'leaf', d: ellipse(512, 610, 320, 50) },
    { id: 'table', d: hill(630, 640) }
  ], [
    ...eyesSmile(512, 360, 50, 12, 34, 16),
    'M512 320a14 14 0 1 0 0.1 0' // 梅干し
  ]),
  makeFood('sandwich', 'サンドイッチ', [
    { id: 'breadTop', d: poly(280, 280, 744, 280, 644, 370, 380, 370) },
    { id: 'ham', d: pill(320, 370, 384, 40, 15) },
    { id: 'cheese', d: poly(300, 410, 724, 410, 750, 450, 512, 430, 274, 450) },
    { id: 'lettuce', d: wavyPuff(512, 470, 450, 55) },
    { id: 'breadBottom', d: pill(310, 500, 404, 75, 25) },
    { id: 'table', d: hill(620, 640) }
  ], [
    ...eyesSmile(512, 330, 45, 10, 26, 12)
  ]),
  makeFood('watermelon', 'すいか', [
    { id: 'rind', d: 'M220 380C220 580 804 580 804 380H220Z' },
    { id: 'flesh', d: 'M260 380C260 540 764 540 764 380H260Z' },
    { id: 'sun', d: circle(860, 140, 60) },
    { id: 'table', d: hill(620, 640) }
  ], [
    'M360 420a8 14 20 1 0 0.1 0M440 450a8 14 10 1 0 0.1 0M512 430a8 14 0 1 0 0.1 0M584 450a8 14 -10 1 0 0.1 0M664 420a8 14 -20 1 0 0.1 0',
    ...eyesSmile(512, 350, 60, 12, 38, 18)
  ]),
  makeFood('apple', 'りんご', [
    { id: 'stem', d: pill(502, 160, 20, 90, 8) },
    { id: 'leaf', d: 'M512 210Q580 150 630 190Q580 240 512 210Z' },
    { id: 'apple', d: 'M512 250C360 160 220 280 260 480C290 620 440 650 512 600C584 650 734 620 764 480C804 280 664 160 512 250Z' },
    { id: 'table', d: hill(630, 650) }
  ], [
    ...eyesSmile(512, 420, 60, 14, 40, 18),
    'M360 340a15 35 -30 1 0 0.1 0' // 光のハイライト
  ]),
  makeFood('banana', 'バナナ', [
    { id: 'peelL', d: 'M380 430C280 460 240 560 280 620C350 620 420 540 440 480Z' },
    { id: 'peelR', d: 'M584 430C684 460 724 560 684 620C614 620 544 540 524 480Z' },
    { id: 'fruit', d: pill(442, 200, 140, 360, 55) },
    { id: 'table', d: hill(630, 640) }
  ], [
    ...eyesSmile(512, 320, 35, 12, 28, 14),
    'M480 200v-50M544 200v-50'
  ]),
  makeFood('grape', 'ぶどう', [
    { id: 'stem', d: pill(502, 140, 20, 90, 8) },
    { id: 'leaf', d: 'M512 210Q620 150 650 220Q580 270 512 210Z' },
    { id: 'cluster', d: `${circle(430, 290, 50)} ${circle(512, 280, 50)} ${circle(594, 290, 50)} ${circle(390, 370, 50)} ${circle(470, 360, 50)} ${circle(554, 360, 50)} ${circle(634, 370, 50)} ${circle(430, 445, 50)} ${circle(512, 440, 50)} ${circle(594, 445, 50)} ${circle(470, 520, 48)} ${circle(554, 520, 48)} ${circle(512, 595, 45)}` },
    { id: 'table', d: hill(640, 650) }
  ], [
    ...eyesSmile(512, 440, 45, 10, 26, 12)
  ]),
  makeFood('pancake', 'パンケーキ', [
    { id: 'butter', d: pill(480, 210, 64, 45, 12) },
    { id: 'cake3', d: ellipse(512, 290, 230, 65) },
    { id: 'cake2', d: ellipse(512, 380, 260, 70) },
    { id: 'cake1', d: ellipse(512, 470, 290, 75) },
    { id: 'plate', d: ellipse(512, 540, 360, 80) },
    { id: 'table', d: hill(620, 640) }
  ], [
    'M480 255q-20 40 0 80M544 255q20 50 0 100', // シロップの垂れ
    ...eyesSmile(512, 400, 55, 12, 34, 16)
  ]),
  makeFood('crepe', 'クレープ', [
    { id: 'strawberry', d: circle(512, 190, 40) },
    { id: 'cream', d: wavyPuff(512, 260, 280, 90) },
    { id: 'crepeFold', d: poly(320, 300, 704, 300, 512, 680) },
    { id: 'sleeve', d: poly(380, 430, 644, 430, 512, 680) },
    { id: 'table', d: hill(650, 660) }
  ], [
    ...eyesSmile(512, 370, 45, 10, 26, 12),
    'M512 155q-15 -20 0 -35'
  ]),
  makeFood('macaron', 'マカロン', [
    { id: 'macaronTop', d: pill(372, 180, 280, 110, 45) },
    { id: 'macaronMid', d: pill(362, 330, 300, 120, 50) },
    { id: 'macaronBot', d: pill(352, 490, 320, 130, 55) },
    { id: 'plate', d: ellipse(512, 640, 320, 60) }
  ], [
    'M382 245h260M372 405h280M362 575h300', // クリームの境界線
    ...eyesSmile(512, 235, 35, 9, 22, 10),
    ...eyesSmile(512, 390, 40, 10, 26, 12),
    ...eyesSmile(512, 555, 45, 11, 30, 14)
  ]),
  makeFood('ramen', 'ラーメン', [
    { id: 'naruto', d: circle(430, 330, 42) },
    { id: 'egg', d: ellipse(590, 330, 48, 40) },
    { id: 'soup', d: ellipse(512, 390, 260, 100) },
    { id: 'bowl', d: 'M252 390C252 610 772 610 772 390Z' },
    { id: 'table', d: hill(630, 640) }
  ], [
    'M430 330a18 18 0 1 0 0.1 0', // なるとの渦巻き
    'M590 330a20 16 0 1 0 0.1 0', // 味玉の黄身
    'M340 440q86 25 172 0q86 25 172 0',
    'M400 240l224 -60M420 260l224 -60', // おはし
    ...eyesSmile(512, 490, 60, 12, 36, 16)
  ])
];

// Combine all 4 genres


const targets = [
  path.resolve(__dirname, '../src/components/svgs'),
  path.resolve(__dirname, '../SVG')
];

for (const t of targets) {
  if (!fs.existsSync(t)) fs.mkdirSync(t, { recursive: true });
}

const allFiles = fs.readdirSync(path.resolve(__dirname, '../SVG')).sort();
const animalFiles = allFiles.filter(f => f.startsWith('Animals_'));
const characterFiles = allFiles.filter(f => f.startsWith('Characters_'));
const foodFiles = allFiles.filter(f => f.startsWith('Food_'));
const vehicleFiles = allFiles.filter(f => f.startsWith('Vehicles_'));

function writeCategory(list, files, catName) {
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const filename = files[i];

    const partsSvg = item.parts.map((p, idx) => {
      const pid = p.id || ('part-' + idx);
      const label = p.label || pid;
      return '    <path id="' + pid + '" class="coloring-part" data-part="' + pid + '" data-label="' + label + '" d="' + p.d + '" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pointer-events="all" style="pointer-events: all; fill: none; stroke: black; stroke-width: 5px;" />';
    }).join('\n');

    const linesSvg = (item.lines || []).map(l =>
      '    <path d="' + l + '" />'
    ).join('\n');

    const fullSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768" width="100%" height="100%">',
      '  <title>' + item.title + '</title>',
      '  <g class="coloring-parts" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">',
      partsSvg,
      '  </g>',
      '  <g class="coloring-lines" pointer-events="none" stroke="black" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" style="pointer-events: none; fill: none; stroke: black; stroke-width: 6px;">',
      linesSvg,
      '  </g>',
      '</svg>'
    ].join('\n');

    for (const dir of targets) {
      fs.writeFileSync(path.join(dir, filename), fullSvg, 'utf-8');
    }
  }
  console.log('Wrote ' + list.length + ' ' + catName + ' SVGs to targets');
}

writeCategory(animals, animalFiles, 'Animals');
writeCategory(characters, characterFiles, 'Characters');
writeCategory(food, foodFiles, 'Food');
writeCategory(vehicles, vehicleFiles, 'Vehicles');
console.log('All 80 SVG files updated successfully in src/components/svgs and SVG!');
