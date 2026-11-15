import type { Difficulty } from '../types';
import { COLORS, dirName, sizeName, shapeName, type FigColor, type Figure, type FigureBoard, type Rotation, type Shape, type Size } from './figures';
import { intBetween, pick, shuffled, type Rng } from './prng';

/**
 * Shape series (what comes next?): rotation, size and count progressions.
 * The key is the next figure; each distractor is the key with exactly ONE attribute broken.
 */

export interface FigurePuzzle {
    readonly kind: 'rotation' | 'size' | 'count' | 'matrix' | 'odd';
    readonly board: FigureBoard;
    /** options[0] is the key. */
    readonly options: readonly Figure[];
    readonly explanation: string;
}

const other = <T>(rng: Rng, all: readonly T[], not: T): T => pick(rng, all.filter(x => x !== not));
const plain = (shape: Shape, color: FigColor): Figure => ({ shape, color, size: 2, rot: 0, count: 1 });
const SHOWN = 4;

function rotation(rng: Rng, difficulty: Difficulty): FigurePuzzle {
    const step = difficulty === 1 ? 90 : pick(rng, [90, 270, 180] as const);
    const base = plain(pick(rng, ['arrow', 'triangle'] as const), pick(rng, COLORS));
    const start = pick(rng, [0, 90, 180, 270] as const);
    const at = (i: number) => (((start + i * step) % 360) as Rotation);
    const cells = Array.from({ length: SHOWN }, (_, i) => ({ ...base, rot: at(i) }));
    const key: Figure = { ...base, rot: at(SHOWN) };
    // didn't turn this time / turned the other way / right turn, wrong colour
    const back = (((key.rot + 180) % 360) as Rotation);
    const wrongTurn = step === 180 ? (((key.rot + 90) % 360) as Rotation) : back;
    const options = [key, { ...key, rot: at(SHOWN - 1) }, { ...key, rot: wrongTurn }, { ...key, color: other(rng, COLORS, key.color) }];
    const turn = step === 90 ? 'רבע סיבוב עם כיוון השעון' : step === 270 ? 'רבע סיבוב נגד כיוון השעון' : 'חצי סיבוב';
    return {
        kind: 'rotation', board: { layout: 'row', cells: [...cells, null] }, options,
        explanation: `בכל צעד ה${shapeName(base.shape)} מסתובב ${turn}. קודם הוא הצביע ${dirName(at(SHOWN - 1))}, `
            + `ולכן עכשיו הוא מצביע ${dirName(key.rot)}.`,
    };
}

function sizes(rng: Rng, difficulty: Difficulty): FigurePuzzle {
    const base = plain(pick(rng, ['circle', 'square', 'star', 'heart'] as const), pick(rng, COLORS));
    const order: readonly Size[] = rng() < 0.5 ? [1, 2, 3] : [3, 2, 1];
    const off = intBetween(rng, 0, 2);
    // d3 also alternates two colours, so two rules must hold at once
    const colors = difficulty === 3 ? [base.color, other(rng, COLORS, base.color)] : [base.color];
    const at = (i: number): Figure => ({ ...base, size: order[(i + off) % 3], color: colors[i % colors.length] });
    const key = at(SHOWN);
    const wrongSize = other(rng, [1, 2, 3] as const, key.size);
    const options = [key, { ...key, size: wrongSize }, { ...key, size: [1, 2, 3].find(s => s !== key.size && s !== wrongSize) as Size },
        { ...key, color: other(rng, COLORS, key.color) }];
    const seq = order.map(s => sizeName(s)).join(', ');
    return {
        kind: 'size', board: { layout: 'row', cells: [...Array.from({ length: SHOWN }, (_, i) => at(i)), null] }, options,
        explanation: `הגודל חוזר בסדר קבוע: ${seq}, ושוב מההתחלה${colors.length > 1 ? ', והצבעים מתחלפים' : ''}. `
            + `לכן עכשיו בא ${shapeName(base.shape)} ${sizeName(key.size)}.`,
    };
}

function counts(rng: Rng, difficulty: Difficulty): FigurePuzzle {
    const base = plain(pick(rng, ['circle', 'square', 'star', 'heart'] as const), pick(rng, COLORS));
    const up = difficulty === 1 || rng() < 0.5;
    // up: 1..4 -> 5 (or 2..5 -> 6); down: 6..3 -> 2
    const first = up ? intBetween(rng, 1, 2) : 6;
    const d = up ? 1 : -1;
    const shapes = difficulty === 3 ? shuffled(rng, ['circle', 'square', 'star', 'heart'] as const).slice(0, 2) : [base.shape];
    const at = (i: number): Figure => ({ ...base, shape: shapes[i % shapes.length], count: first + d * i });
    const key = at(SHOWN);
    const options = [key, { ...key, count: key.count + d }, { ...key, count: key.count - d },
        { ...key, shape: other(rng, ['circle', 'square', 'star', 'heart'] as const, key.shape) }];
    return {
        kind: 'count', board: { layout: 'row', cells: [...Array.from({ length: SHOWN }, (_, i) => at(i)), null] }, options,
        explanation: `בכל צעד יש צורה אחת ${up ? 'יותר' : 'פחות'}${shapes.length > 1 ? ', והצורות מתחלפות' : ''}. `
            + `אחרי ${key.count - d} באות ${key.count}.`,
    };
}

export function seriesPuzzle(rng: Rng, difficulty: Difficulty): FigurePuzzle {
    return pick(rng, [rotation, sizes, counts])(rng, difficulty);
}
