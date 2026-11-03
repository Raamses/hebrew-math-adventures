export type CrosswordMode = 'daily' | 'free';

export type CellType = 'digit' | 'operator' | 'equals' | 'empty';

export interface CellContent {
  row: number;
  col: number;
  char: string;
  solution: string;
  isGiven: boolean;
  type: CellType;
}

export interface EquationSpec {
  text: string;
  direction: 'horizontal' | 'vertical';
  row: number;
  col: number;
  solution: string[];
}

export interface CrosswordPuzzle {
  grid: CellContent[][];
  equations: {
    horizontal: EquationSpec;
    vertical: EquationSpec;
  };
  mode: CrosswordMode;
  seed: string;
  date?: string;
}

export interface CellCheckResult {
  row: number;
  col: number;
  correct: boolean;
}

export interface CheckCrosswordResult {
  results: CellCheckResult[];
  solved: boolean;
}

function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getLocalDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const OPS: { op: string; fn: (x: number, y: number) => number }[] = [
  { op: '+', fn: (x, y) => x + y },
  { op: '−', fn: (x, y) => x - y },
  { op: '×', fn: (x, y) => x * y },
];

function evalOp(x: number, op: string, y: number): number {
  if (op === '+') return x + y;
  if (op === '−') return x - y;
  if (op === '×') return x * y;
  return NaN;
}

interface RawEquation {
  a: number;
  op: string;
  b: number;
  c: number;
  text: string;
  solution: string[];
}

function getEquationsForA(a: number): RawEquation[] {
  const list: RawEquation[] = [];
  for (let b = 0; b <= 9; b++) {
    for (const { op, fn } of OPS) {
      const c = fn(a, b);
      if (c >= 0 && c <= 9 && Number.isInteger(c)) {
        list.push({
          a,
          op,
          b,
          c,
          text: `${a}${op}${b}=${c}`,
          solution: [String(a), op, String(b), '=', String(c)],
        });
      }
    }
  }
  return list;
}

function solvePuzzle(
  eq1: RawEquation,
  eq2: RawEquation,
  blanks: number[],
): number {
  const vals = [eq1.a, eq1.b, eq1.c, eq2.b, eq2.c];
  let solutionsCount = 0;

  function backtrack(bIdx: number) {
    if (bIdx === blanks.length) {
      if (
        evalOp(vals[0], eq1.op, vals[1]) === vals[2] &&
        evalOp(vals[0], eq2.op, vals[3]) === vals[4]
      ) {
        solutionsCount++;
      }
      return;
    }
    const pos = blanks[bIdx];
    for (let d = 0; d <= 9; d++) {
      vals[pos] = d;
      backtrack(bIdx + 1);
      if (solutionsCount > 1) return;
    }
  }

  backtrack(0);
  return solutionsCount;
}

const FREE_POOL = [
  'crossword-free-alpha',
  'crossword-free-beta',
  'crossword-free-gamma',
  'crossword-free-delta',
  'crossword-free-epsilon',
  'crossword-free-zeta',
  'crossword-free-eta',
  'crossword-free-theta',
];

export function generateCrossword(
  mode: CrosswordMode,
  opts?: { date?: string; seed?: string },
): CrosswordPuzzle {
  const date = mode === 'daily' ? (opts?.date ?? getLocalDateISO()) : undefined;
  const initialSeed =
    opts?.seed ??
    (mode === 'daily'
      ? `crossword-daily-${date}`
      : FREE_POOL[Math.floor(Math.random() * FREE_POOL.length)]);

  let currentSeed = initialSeed;

  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = mulberry32(hashString(currentSeed));
    const a = 1 + Math.floor(rng() * 9);
    const eqs = getEquationsForA(a);
    if (eqs.length >= 2) {
      const idx1 = Math.floor(rng() * eqs.length);
      let idx2 = Math.floor(rng() * eqs.length);
      if (idx2 === idx1 && eqs.length > 1) {
        idx2 = (idx1 + 1) % eqs.length;
      }
      const eq1 = eqs[idx1];
      const eq2 = eqs[idx2];

      const candidateBlanks = [
        [0, 4],
        [0, 2],
        [1, 4],
        [2, 4],
        [0, 3],
        [1, 3],
      ];
      const blankOrder = candidateBlanks.slice().sort(() => rng() - 0.5);

      for (const blanks of blankOrder) {
        if (solvePuzzle(eq1, eq2, blanks) === 1) {
          const blankSet = new Set(blanks);
          const grid: CellContent[][] = [];
          for (let r = 0; r < 5; r++) {
            const row: CellContent[] = [];
            for (let c = 0; c < 5; c++) {
              row.push({
                row: r,
                col: c,
                char: '',
                solution: '',
                isGiven: true,
                type: 'empty',
              });
            }
            grid.push(row);
          }

          grid[0][0] = {
            row: 0,
            col: 0,
            char: String(eq1.a),
            solution: String(eq1.a),
            isGiven: !blankSet.has(0),
            type: 'digit',
          };
          grid[0][1] = {
            row: 0,
            col: 1,
            char: eq1.op,
            solution: eq1.op,
            isGiven: true,
            type: 'operator',
          };
          grid[0][2] = {
            row: 0,
            col: 2,
            char: String(eq1.b),
            solution: String(eq1.b),
            isGiven: !blankSet.has(1),
            type: 'digit',
          };
          grid[0][3] = {
            row: 0,
            col: 3,
            char: '=',
            solution: '=',
            isGiven: true,
            type: 'equals',
          };
          grid[0][4] = {
            row: 0,
            col: 4,
            char: String(eq1.c),
            solution: String(eq1.c),
            isGiven: !blankSet.has(2),
            type: 'digit',
          };

          grid[1][0] = {
            row: 1,
            col: 0,
            char: eq2.op,
            solution: eq2.op,
            isGiven: true,
            type: 'operator',
          };
          grid[2][0] = {
            row: 2,
            col: 0,
            char: String(eq2.b),
            solution: String(eq2.b),
            isGiven: !blankSet.has(3),
            type: 'digit',
          };
          grid[3][0] = {
            row: 3,
            col: 0,
            char: '=',
            solution: '=',
            isGiven: true,
            type: 'equals',
          };
          grid[4][0] = {
            row: 4,
            col: 0,
            char: String(eq2.c),
            solution: String(eq2.c),
            isGiven: !blankSet.has(4),
            type: 'digit',
          };

          return {
            grid,
            equations: {
              horizontal: {
                text: eq1.text,
                direction: 'horizontal',
                row: 0,
                col: 0,
                solution: eq1.solution,
              },
              vertical: {
                text: eq2.text,
                direction: 'vertical',
                row: 0,
                col: 0,
                solution: eq2.solution,
              },
            },
            mode,
            seed: currentSeed,
            ...(date ? { date } : {}),
          };
        }
      }
    }
    currentSeed = `${currentSeed}-retry-${attempt + 1}`;
  }

  // Deterministic fallback
  const fallbackEq1: RawEquation = { a: 2, op: '+', b: 3, c: 5, text: '2+3=5', solution: ['2', '+', '3', '=', '5'] };
  const fallbackEq2: RawEquation = { a: 2, op: '×', b: 4, c: 8, text: '2×4=8', solution: ['2', '×', '4', '=', '8'] };
  const fallbackGrid: CellContent[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({
      row: r,
      col: c,
      char: '',
      solution: '',
      isGiven: true,
      type: 'empty' as CellType,
    })),
  );
  fallbackGrid[0][0] = { row: 0, col: 0, char: '2', solution: '2', isGiven: false, type: 'digit' };
  fallbackGrid[0][1] = { row: 0, col: 1, char: '+', solution: '+', isGiven: true, type: 'operator' };
  fallbackGrid[0][2] = { row: 0, col: 2, char: '3', solution: '3', isGiven: true, type: 'digit' };
  fallbackGrid[0][3] = { row: 0, col: 3, char: '=', solution: '=', isGiven: true, type: 'equals' };
  fallbackGrid[0][4] = { row: 0, col: 4, char: '5', solution: '5', isGiven: false, type: 'digit' };

  fallbackGrid[1][0] = { row: 1, col: 0, char: '×', solution: '×', isGiven: true, type: 'operator' };
  fallbackGrid[2][0] = { row: 2, col: 0, char: '4', solution: '4', isGiven: true, type: 'digit' };
  fallbackGrid[3][0] = { row: 3, col: 0, char: '=', solution: '=', isGiven: true, type: 'equals' };
  fallbackGrid[4][0] = { row: 4, col: 0, char: '8', solution: '8', isGiven: false, type: 'digit' };

  return {
    grid: fallbackGrid,
    equations: {
      horizontal: { text: fallbackEq1.text, direction: 'horizontal', row: 0, col: 0, solution: fallbackEq1.solution },
      vertical: { text: fallbackEq2.text, direction: 'vertical', row: 0, col: 0, solution: fallbackEq2.solution },
    },
    mode,
    seed: currentSeed,
    ...(date ? { date } : {}),
  };
}

export function checkCrossword(
  puzzle: CrosswordPuzzle,
  answers: string[][],
): CheckCrosswordResult {
  const results: CellCheckResult[] = [];
  let solved = true;

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = puzzle.grid[r][c];
      if (cell.type === 'empty') continue;
      const actual = answers[r]?.[c]?.trim() ?? '';
      const correct = actual === cell.solution;
      results.push({ row: r, col: c, correct });
      if (!correct) {
        solved = false;
      }
    }
  }

  return {
    results,
    solved: results.length > 0 && solved,
  };
}
