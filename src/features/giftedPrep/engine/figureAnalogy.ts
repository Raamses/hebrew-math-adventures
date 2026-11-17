import type { Difficulty } from '../types';
import { canon, COLORS, colorName, label, shapeName, sizeName, type FigColor, type Figure, type Rotation, type Shape, type Size } from './figures';
import type { FigurePuzzle } from './figureSeries';
import { pick, type Rng } from './prng';

/**
 * Figural analogies, "A is to B as C is to ?": one rule turns A into B, and the child applies the same rule to C.
 * Rules: a quarter or half turn, a left-right or up-down mirror, a size change, a colour change.
 * The rule must be readable from A→B alone, so for turns and mirrors A is always the flag (it looks different
 * in every one of its 8 orientations: a single turn or mirror explains A→B). For size and colour, C keeps A's
 * size or colour, so "become big" and "grow by one step" (or "become blue" and "swap red and blue") agree.
 * The key is the rule applied to C; each distractor is the key with exactly ONE attribute broken.
 */

export type Turn = 'rot90' | 'rot180' | 'rot270' | 'mirrorLR' | 'mirrorUD';
export const TURNS: readonly Turn[] = ['rot90', 'rot180', 'rot270', 'mirrorLR', 'mirrorUD'];
export type AnalogyRule = Turn | 'size' | 'color';

const RULES: Readonly<Record<Difficulty, readonly AnalogyRule[]>> = {
    // d1: one quarter-turn direction (clockwise) and the half turn; d2 adds anticlockwise and both mirrors
    1: ['size', 'color', 'rot90', 'rot180'],
    2: ['size', 'color', 'rot90', 'rot270', 'rot180', 'mirrorLR', 'mirrorUD'],
    // d3: A and C start in different orientations, so copying B's direction is wrong
    3: ['rot90', 'rot270', 'rot180', 'mirrorLR', 'mirrorUD', 'size', 'color'],
};

const ROTS: readonly Rotation[] = [0, 90, 180, 270];
const SIZES: readonly Size[] = [1, 2, 3];
/** Shapes whose turns the child can see; flat shapes carry the size and colour rules. */
const TURNABLE: readonly Shape[] = ['flag', 'arrow', 'triangle'];
const FLAT: readonly Shape[] = ['circle', 'square', 'star', 'heart'];

const norm = (deg: number) => ((((deg % 360) + 360) % 360) as Rotation);
const other = <T>(rng: Rng, all: readonly T[], ...not: T[]): T => pick(rng, all.filter(x => !not.includes(x)));
const fig = (shape: Shape, color: FigColor, size: Size, rot: Rotation = 0, flip = false): Figure =>
    ({ shape, color, size, rot, count: 1, ...(flip ? { flip } : {}) });

/**
 * The figure after a turn or mirror of the whole picture. A figure is drawn as rotate(rot) of (mirror if flip),
 * so mirroring the drawing left-right gives rotate(-rot) of the opposite mirror, and up-down rotate(180-rot).
 */
export function turn(f: Figure, t: Turn): Figure {
    const flip = !f.flip;
    switch (t) {
        case 'rot90': return { ...f, rot: norm(f.rot + 90) };
        case 'rot180': return { ...f, rot: norm(f.rot + 180) };
        case 'rot270': return { ...f, rot: norm(f.rot + 270) };
        case 'mirrorLR': return { ...f, rot: norm(-f.rot), flip };
        case 'mirrorUD': return { ...f, rot: norm(180 - f.rot), flip };
    }
}

/** The turns a child most often swaps for each rule, tried first as the "wrong move" distractor. */
const CONFUSED: Readonly<Record<Turn, readonly Turn[]>> = {
    rot90: ['rot270', 'mirrorLR', 'rot180'],
    rot270: ['rot90', 'mirrorLR', 'rot180'],
    rot180: ['mirrorUD', 'mirrorLR', 'rot90'],
    mirrorLR: ['rot180', 'mirrorUD', 'rot90'],
    mirrorUD: ['rot180', 'mirrorLR', 'rot90'],
};

const DOES: Readonly<Record<Turn, string>> = {
    rot90: 'הסתובב רבע סיבוב עם כיוון השעון',
    rot270: 'הסתובב רבע סיבוב נגד כיוון השעון',
    rot180: 'הסתובב חצי סיבוב',
    mirrorLR: 'התהפך כמו במראה, וימין ושמאל התחלפו',
    mirrorUD: 'התהפך, ולמעלה ולמטה התחלפו',
};

const same = (a: Figure, b: Figure) => label(a) === label(b);

interface Parts { readonly a: Figure; readonly b: Figure; readonly c: Figure; readonly key: Figure; readonly wrong: readonly Figure[]; readonly does: string }

function turnParts(rng: Rng, difficulty: Difficulty, t: Turn): Parts | null {
    const free = difficulty === 3;
    const a = fig('flag', pick(rng, COLORS), 2, free ? pick(rng, ROTS) : 0, free && rng() < 0.5);
    const shape = pick(rng, TURNABLE);
    const c = fig(shape, other(rng, COLORS, a.color), free ? pick(rng, SIZES) : 2,
        free ? pick(rng, ROTS) : a.rot, free ? rng() < 0.5 : !!a.flip);
    const key = turn(c, t);
    // a turn that leaves C looking the same (an upright arrow in a left-right mirror) teaches nothing;
    // at d3 C must also start facing another way than A, so copying B's direction is a real trap
    // (an arrow or triangle has no mirror side, so only its direction counts)
    const sameWay = c.rot === a.rot && (shape !== 'flag' || !!c.flip === !!a.flip);
    if (same(key, c) || (free && sameWay)) return null;
    // two turns can land on the same picture (an upright arrow: half turn = up-down mirror), so keep one of each
    const moves = CONFUSED[t].map(u => turn(c, u))
        .filter((m, i, all) => !same(m, key) && !same(m, c) && all.findIndex(x => same(x, m)) === i);
    if (moves.length === 0) return null;
    const fourth = moves.length > 1 && rng() < 0.5 ? moves[1] : { ...key, color: other(rng, COLORS, key.color, a.color) };
    return { a, b: turn(a, t), c, key, wrong: [c, moves[0], fourth], does: DOES[t] };
}

function sizeParts(rng: Rng): Parts {
    const from = pick(rng, SIZES);
    const to = other(rng, SIZES, from);
    const a = fig(pick(rng, FLAT), pick(rng, COLORS), from);
    const c = fig(other(rng, FLAT, a.shape), pick(rng, COLORS), from);
    const key: Figure = { ...c, size: to };
    const third = other(rng, SIZES, from, to);
    return { a, b: { ...a, size: to }, c, key, wrong: [c, { ...key, size: third }, { ...key, color: other(rng, COLORS, c.color) }], does: `נהיה ${sizeName(to)}` };
}

function colorParts(rng: Rng): Parts {
    const from = pick(rng, COLORS);
    const to = other(rng, COLORS, from);
    const a = fig(pick(rng, FLAT), from, pick(rng, SIZES));
    const c = fig(other(rng, FLAT, a.shape), from, pick(rng, SIZES));
    const key: Figure = { ...c, color: to };
    return {
        a, b: { ...a, color: to }, c, key, does: `נהיה ${colorName(to)}`,
        wrong: [c, { ...key, color: other(rng, COLORS, from, to) }, { ...key, size: other(rng, SIZES, c.size) }],
    };
}

export function analogyPuzzle(rng: Rng, difficulty: Difficulty): FigurePuzzle {
    for (;;) {
        const rule = pick(rng, RULES[difficulty]);
        const p = rule === 'size' ? sizeParts(rng) : rule === 'color' ? colorParts(rng) : turnParts(rng, difficulty, rule);
        if (!p) continue;
        const options = [p.key, ...p.wrong];
        if (new Set(options.map(label)).size < 4) continue;
        const [a, c] = [shapeName(p.a.shape), shapeName(p.c.shape)];
        return {
            kind: 'analogy',
            board: { layout: 'analogy', cells: [canon(p.a), canon(p.b), canon(p.c), null] },
            options,
            explanation: `בזוג הראשון ה${a} ${p.does}. בזוג השני גם ה${c} ${p.does}, ולכן מקבלים ${label(p.key)}.`,
        };
    }
}
