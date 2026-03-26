import { describe, it, expect } from 'vitest';
import {
  PNAMES, PID, DIFF, PRIZE_TABLE, LINE_SCORE,
  shape, hit, tryRot, ghostY, lock, clearRows,
  linePrize, fmtYen, relTime,
  buildDeck, excludeFromDeck,
  emptyBoard,
} from '../game-logic.js';

// ================================================================
//  テトリスエンジン
// ================================================================
describe('shape', () => {
  it('全7種 × 4回転が定義されている', () => {
    for (const t of PNAMES) {
      for (let r = 0; r < 4; r++) {
        const s = shape(t, r);
        expect(s).toHaveLength(4);
        for (const [x, y] of s) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('Oピースは全回転で同じ形', () => {
    const s0 = shape('O', 0);
    for (let r = 1; r < 4; r++) expect(shape('O', r)).toEqual(s0);
  });
});

describe('hit (衝突判定)', () => {
  it('空のボードでは衝突しない', () => {
    expect(hit(emptyBoard(20), 'T', 3, 0, 0)).toBe(0);
  });

  it('左壁にはみ出すと衝突', () => {
    expect(hit(emptyBoard(20), 'I', -1, 0, 0)).toBe(1);
  });

  it('右壁にはみ出すと衝突', () => {
    expect(hit(emptyBoard(20), 'I', 8, 0, 0)).toBe(1);
  });

  it('底にはみ出すと衝突', () => {
    expect(hit(emptyBoard(20), 'T', 3, 19, 0)).toBe(1);
  });

  it('既存ブロックと重なると衝突', () => {
    const b = emptyBoard(20);
    b[10][4] = 1;
    expect(hit(b, 'T', 3, 9, 0)).toBe(1);
  });
});

describe('tryRot (SRS回転)', () => {
  it('空のボードで回転できる', () => {
    const result = tryRot(emptyBoard(20), 'T', 4, 10, 0);
    expect(result).not.toBeNull();
    expect(result.r).toBe(1);
  });

  it('壁際でウォールキックが働く', () => {
    expect(tryRot(emptyBoard(20), 'T', 8, 10, 0)).not.toBeNull();
  });

  it('完全に詰まっていたら回転できない', () => {
    const b = emptyBoard(20);
    for (let r = 0; r < 20; r++) for (let c = 0; c < 10; c++) b[r][c] = 1;
    b[10][5] = 0;
    expect(tryRot(b, 'T', 5, 10, 0)).toBeNull();
  });
});

describe('ghostY (ゴースト位置)', () => {
  it('空のボードでは底に落ちる', () => {
    expect(ghostY(emptyBoard(20), 'T', 4, 0, 0)).toBe(18);
  });

  it('ブロックがあるとその手前で止まる', () => {
    const b = emptyBoard(20);
    for (let c = 0; c < 10; c++) b[15][c] = 1;
    expect(ghostY(b, 'T', 4, 0, 0)).toBe(13);
  });
});

describe('lock (ブロック固定)', () => {
  it('ピースをボードに固定する', () => {
    const b = emptyBoard(20);
    lock(b, 'O', 4, 0, 0);
    expect(b[0][4]).toBe(PID.O);
    expect(b[0][5]).toBe(PID.O);
    expect(b[1][4]).toBe(PID.O);
    expect(b[1][5]).toBe(PID.O);
    expect(b[0][3]).toBe(0);
  });
});

describe('clearRows (行消し)', () => {
  it('揃った行を消す', () => {
    const b = emptyBoard(20);
    for (let c = 0; c < 10; c++) b[19][c] = 1;
    expect(clearRows(b)).toBe(1);
    expect(b[19].every(v => v === 0)).toBe(true);
  });

  it('複数行を同時に消す', () => {
    const b = emptyBoard(20);
    for (let c = 0; c < 10; c++) { b[18][c] = 1; b[19][c] = 1; }
    expect(clearRows(b)).toBe(2);
  });

  it('揃ってない行は消さない', () => {
    const b = emptyBoard(20);
    for (let c = 0; c < 9; c++) b[19][c] = 1;
    expect(clearRows(b)).toBe(0);
  });

  it('消した後に上の行が落ちてくる', () => {
    const b = emptyBoard(20);
    b[17][3] = 5;
    for (let c = 0; c < 10; c++) b[18][c] = 1;
    clearRows(b);
    expect(b[18][3]).toBe(5);
    expect(b[17][3]).toBe(0);
  });
});

// ================================================================
//  賞金テーブル
// ================================================================
describe('linePrize (行消し賞金)', () => {
  it('鬼で1行消し = 0円', () => {
    expect(linePrize('demon', 1)).toBe(0);
  });

  it('鬼で2行消し = 7,000円', () => {
    expect(linePrize('demon', 2)).toBe(7000);
  });

  it('鬼で3行消し = 15,000円', () => {
    expect(linePrize('demon', 3)).toBe(15000);
  });

  it('鬼でテトリス = 30,000円', () => {
    expect(linePrize('demon', 4)).toBe(30000);
  });

  it('ゆるゆるは1行からもらえる', () => {
    expect(linePrize('easy', 1)).toBe(500);
    expect(linePrize('easy', 2)).toBe(2000);
    expect(linePrize('easy', 3)).toBe(4000);
    expect(linePrize('easy', 4)).toBe(8000);
  });

  it('ふつう', () => {
    expect(linePrize('normal', 1)).toBe(1000);
    expect(linePrize('normal', 4)).toBe(12000);
  });

  it('ガチ', () => {
    expect(linePrize('hard', 1)).toBe(1500);
    expect(linePrize('hard', 4)).toBe(20000);
  });

  it('0行消しは全難易度で0円', () => {
    for (const d of ['easy', 'normal', 'hard', 'demon']) {
      expect(linePrize(d, 0)).toBe(0);
    }
  });

  it('5行以上は4行と同額（上限）', () => {
    expect(linePrize('easy', 5)).toBe(linePrize('easy', 4));
  });
});

describe('fmtYen (金額フォーマット)', () => {
  it('1万円以上は「万円」表示', () => {
    expect(fmtYen(10000)).toBe('1万円');
    expect(fmtYen(50000)).toBe('5万円');
  });

  it('1万円未満はカンマ区切り', () => {
    expect(fmtYen(1000)).toBe('1,000円');
    expect(fmtYen(0)).toBe('0円');
  });
});

describe('LINE_SCORE', () => {
  it('行数に応じたスコアが定義されている', () => {
    expect(LINE_SCORE).toEqual([0, 100, 300, 500, 800]);
  });
});

// ================================================================
//  デッキ操作
// ================================================================
describe('buildDeck', () => {
  it('v1/v2はピース7種+ACE+JOKER', () => {
    const dk = buildDeck('v1');
    expect(dk).toHaveLength(9);
    expect(dk).toContain('ACE');
    expect(dk).toContain('JOKER');
    for (const p of PNAMES) expect(dk).toContain(p);
  });

  it('v3はピース7種+FREE×7+MISS×3', () => {
    const dk = buildDeck('v3');
    expect(dk).toHaveLength(17);
    expect(dk.filter(c => c === 'FREE')).toHaveLength(7);
    expect(dk.filter(c => c === 'MISS')).toHaveLength(3);
  });
});

describe('excludeFromDeck', () => {
  it('指定カードを1枚だけ除去', () => {
    const dk = ['I', 'O', 'T', 'I', 'S'];
    excludeFromDeck(dk, 'I');
    expect(dk).toHaveLength(4);
    expect(dk.filter(c => c === 'I')).toHaveLength(1);
  });

  it('存在しないカードは何もしない', () => {
    const dk = ['I', 'O'];
    excludeFromDeck(dk, 'Z');
    expect(dk).toHaveLength(2);
  });
});

// ================================================================
//  相対時間
// ================================================================
describe('relTime', () => {
  it('直前は「たった今」', () => {
    expect(relTime(Date.now())).toBe('たった今');
    expect(relTime(Date.now() - 30000)).toBe('たった今');
  });

  it('1分以上は「N分前」', () => {
    expect(relTime(Date.now() - 60000)).toBe('1分前');
    expect(relTime(Date.now() - 300000)).toBe('5分前');
  });

  it('1時間以上は「N時間前」', () => {
    expect(relTime(Date.now() - 3600000)).toBe('1時間前');
  });
});

// ================================================================
//  DIFF定数
// ================================================================
describe('DIFF (難易度定義)', () => {
  it('4難易度が定義されている', () => {
    expect(Object.keys(DIFF)).toEqual(['easy', 'normal', 'hard', 'demon']);
  });

  it('速度は難易度順に速くなる', () => {
    expect(DIFF.easy.speed).toBeGreaterThan(DIFF.normal.speed);
    expect(DIFF.normal.speed).toBeGreaterThan(DIFF.hard.speed);
    expect(DIFF.hard.speed).toBeGreaterThan(DIFF.demon.speed);
  });
});

describe('PRIZE_TABLE', () => {
  it('全難易度で5要素（0〜4行）', () => {
    for (const d of ['easy', 'normal', 'hard', 'demon']) {
      expect(PRIZE_TABLE[d]).toHaveLength(5);
      expect(PRIZE_TABLE[d][0]).toBe(0);
    }
  });

  it('同時消しが多いほど高い（各難易度）', () => {
    for (const d of ['easy', 'normal', 'hard']) {
      for (let i = 1; i < 4; i++) {
        expect(PRIZE_TABLE[d][i + 1]).toBeGreaterThan(PRIZE_TABLE[d][i]);
      }
    }
  });

  it('鬼の1行は0円', () => {
    expect(PRIZE_TABLE.demon[1]).toBe(0);
    expect(PRIZE_TABLE.demon[2]).toBeGreaterThan(0);
  });
});

// ================================================================
//  統合テスト
// ================================================================
describe('統合: 配置→行消し→賞金', () => {
  it('Iピースで1行消して鬼 = 0円', () => {
    const b = emptyBoard(20);
    for (let c = 1; c < 10; c++) b[19][c] = 3;
    lock(b, 'I', -2, 16, 1);
    const cleared = clearRows(b);
    expect(cleared).toBe(1);
    expect(linePrize('demon', cleared)).toBe(0);
  });

  it('Iピースで1行消してゆるゆる = 500円', () => {
    const b = emptyBoard(20);
    for (let c = 1; c < 10; c++) b[19][c] = 3;
    lock(b, 'I', -2, 16, 1);
    const cleared = clearRows(b);
    expect(linePrize('easy', cleared)).toBe(500);
  });

  it('ゴースト位置に落として行消し', () => {
    const b = emptyBoard(20);
    for (let c = 1; c < 10; c++) b[19][c] = 2;
    const gy = ghostY(b, 'I', -2, 0, 1);
    expect(gy).toBe(16);
    lock(b, 'I', -2, gy, 1);
    expect(clearRows(b)).toBe(1);
  });

  it('4行同時消し(テトリス)の賞金', () => {
    const b = emptyBoard(20);
    for (let r = 16; r < 20; r++)
      for (let c = 0; c < 10; c++) b[r][c] = 1;
    const cleared = clearRows(b);
    expect(cleared).toBe(4);
    expect(linePrize('easy', 4)).toBe(8000);
    expect(linePrize('demon', 4)).toBe(30000);
  });
});

// ================================================================
//  エッジケース
// ================================================================
describe('エッジケース', () => {
  it('空のボードで行消しは0', () => {
    expect(clearRows(emptyBoard(20))).toBe(0);
  });

  it('PIDは1-7の範囲', () => {
    for (const t of PNAMES) {
      expect(PID[t]).toBeGreaterThanOrEqual(1);
      expect(PID[t]).toBeLessThanOrEqual(7);
    }
  });
});
