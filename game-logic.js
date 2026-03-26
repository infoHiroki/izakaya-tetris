/**
 * index.html 内のゲームロジックを Node.js でテスト可能にする抽出モジュール。
 * テトリスエンジン・賞金計算・デッキ操作などの純粋関数を export する。
 */

// ================================================================
//  TETRIS ENGINE (SRS) - index.html から抽出
// ================================================================
const PIECES = {
  I:[[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]],[[0,2],[1,2],[2,2],[3,2]],[[1,0],[1,1],[1,2],[1,3]]],
  O:[[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]]],
  T:[[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]],
  S:[[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]],[[1,1],[2,1],[0,2],[1,2]],[[0,0],[0,1],[1,1],[1,2]]],
  Z:[[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[1,2],[2,2]],[[1,0],[0,1],[1,1],[0,2]]],
  J:[[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]],
  L:[[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]]
};
const PNAMES = ['I','O','T','S','Z','J','L'];
const PID = {I:1,O:2,T:3,S:4,Z:5,J:6,L:7};
const CIDCOL = ['','#00d4d4','#d4d400','#9020d0','#00c800','#d42020','#2050d0','#d49000'];
const KICKS = {
  n:[[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],[[0,0],[1,0],[1,1],[0,-2],[1,-2]],[[0,0],[1,0],[1,-1],[0,2],[1,2]],[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]]],
  I:[[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],[[0,0],[1,0],[-2,0],[1,2],[-2,-1]]]
};

function shape(t, r) { return PIECES[t][r]; }

function hit(b, t, x, y, r, rows) {
  const H = rows || b.length;
  for (const [dx, dy] of shape(t, r)) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= 10 || ny >= H) return 1;
    if (ny >= 0 && b[ny][nx]) return 1;
  }
  return 0;
}

function tryRot(b, t, x, y, fr, rows) {
  const tr = (fr + 1) % 4;
  const ks = t === 'I' ? KICKS.I[fr] : KICKS.n[fr];
  for (const [kx, ky] of ks) {
    if (!hit(b, t, x + kx, y - ky, tr, rows)) return { x: x + kx, y: y - ky, r: tr };
  }
  return null;
}

function ghostY(b, t, x, y, r, rows) {
  let g = y;
  while (!hit(b, t, x, g + 1, r, rows)) g++;
  return g;
}

function lock(b, t, x, y, r) {
  const H = b.length;
  const id = PID[t];
  for (const [dx, dy] of shape(t, r)) {
    const nx = x + dx, ny = y + dy;
    if (ny >= 0 && ny < H && nx >= 0 && nx < 10) b[ny][nx] = id;
  }
}

function clearRows(b) {
  let c = 0;
  for (let r = b.length - 1; r >= 0; r--) {
    if (b[r].every(v => v)) {
      b.splice(r, 1);
      b.unshift(Array(10).fill(0));
      c++;
      r++;
    }
  }
  return c;
}

// ================================================================
//  DIFFICULTY & PRIZES
// ================================================================
const DIFF = {
  easy:   { label:'🐢 ゆるゆる', speed:500 },
  normal: { label:'🏃 ふつう',   speed:300 },
  hard:   { label:'🔥 ガチ',     speed:180 },
  demon:  { label:'💀 鬼',       speed:100 }
};
const PRIZE_TABLE = {
  easy:   [0, 500, 2000, 4000, 8000],
  normal: [0, 1000, 3000, 6000, 12000],
  hard:   [0, 1500, 5000, 10000, 20000],
  demon:  [0, 0, 7000, 15000, 30000]
};
const LINE_SCORE = [0, 100, 300, 500, 800];

function linePrize(diff, lines) {
  return (PRIZE_TABLE[diff] || PRIZE_TABLE.easy)[Math.min(lines, 4)] || 0;
}

function fmtYen(n) {
  return n >= 10000 ? (n / 10000) + '万円' : n.toLocaleString() + '円';
}

// ================================================================
//  LOG HELPER
// ================================================================
function relTime(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return 'たった今';
  if (d < 3600) return Math.floor(d / 60) + '分前';
  return Math.floor(d / 3600) + '時間前';
}

// ================================================================
//  DECK OPERATIONS
// ================================================================
function buildDeck(version) {
  if (version === 'v3') {
    const dk = [...PNAMES];
    for (let i = 0; i < 7; i++) dk.push('FREE');
    for (let i = 0; i < 3; i++) dk.push('MISS');
    return dk;
  }
  return [...PNAMES, 'ACE', 'JOKER'];
}

function excludeFromDeck(dk, card) {
  const i = dk.indexOf(card);
  if (i >= 0) dk.splice(i, 1);
  return dk;
}

// ================================================================
//  BOARD HELPERS
// ================================================================
function emptyBoard(rows) {
  return Array.from({ length: rows || 20 }, () => Array(10).fill(0));
}

function fillRow(b, row, gap) {
  // 指定行を gap 列だけ空けて埋める
  for (let c = 0; c < 10; c++) {
    b[row][c] = c === gap ? 0 : Math.floor(Math.random() * 7) + 1;
  }
}

export {
  PIECES, PNAMES, PID, CIDCOL, KICKS, DIFF, PRIZE_TABLE, LINE_SCORE,
  shape, hit, tryRot, ghostY, lock, clearRows,
  linePrize, fmtYen, relTime,
  buildDeck, excludeFromDeck,
  emptyBoard, fillRow,
};
