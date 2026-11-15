import type { Difficulty } from '../types';
import { COLORS, colorName, label, shapeName, sizeName, type FigColor, type Figure, type Shape, type Size } from './figures';
import type { FigurePuzzle } from './figureSeries';
import { intBetween, pick, shuffled, type Rng } from './prng';

/** 3×3 colour+shape matrices and "which shape does not belong". */

const FLAT: readonly Shape[] = ['circle', 'square', 'triangle', 'star', 'heart'];
const fig = (shape: Shape, color: FigColor, size: Size = 2, count = 1): Figure => ({ shape, color, size, rot: 0, count });

/**
 * d1–2: every row keeps one shape, every column one colour. d3: each row and column holds every shape and
 * every colour once (two Latin squares). Distractors break one rule each: wrong colour, wrong shape, wrong size.
 */
export function matrixPuzzle(rng: Rng, difficulty: Difficulty): FigurePuzzle {
    const shapes = shuffled(rng, FLAT).slice(0, 3);
    const colors = shuffled(rng, COLORS).slice(0, 3);
    const latin = difficulty === 3;
    const cell = (r: number, c: number) => (latin
        ? fig(shapes[(r + c) % 3], colors[(r + 2 * c) % 3])
        : fig(shapes[r], colors[c]));
    const missing = difficulty === 1 ? 8 : intBetween(rng, 0, 8);
    const [mr, mc] = [Math.floor(missing / 3), missing % 3];
    const key = cell(mr, mc);
    const cells = Array.from({ length: 9 }, (_, i) => (i === missing ? null : cell(Math.floor(i / 3), i % 3)));
    const options = [
        key,
        { ...key, color: pick(rng, colors.filter(c => c !== key.color)) },
        { ...key, shape: pick(rng, shapes.filter(s => s !== key.shape)) },
        { ...key, size: pick(rng, [1, 3] as const) },
    ];
    const explanation = latin
        ? `בכל שורה ובכל טור כל צורה מופיעה פעם אחת וכל צבע מופיע פעם אחת. לכן חסר ${label(key)}.`
        : `בכל שורה יש אותה צורה, ובכל טור אותו צבע. בשורה של סימן השאלה יש ${shapeName(key.shape, true)}, `
            + `ובטור שלו הכול ${colorName(key.color)}. לכן חסר ${label(key)}.`;
    return { kind: 'matrix', board: { layout: 'grid', cells }, options, explanation };
}

type Attr = 'shape' | 'color' | 'size' | 'count';

/** The attribute the three others share, and how it differs; d1 shape, d2 colour, d3 size or count. */
const ODD_ATTR: Readonly<Record<Difficulty, readonly Attr[]>> = { 1: ['shape'], 2: ['color'], 3: ['size', 'count'] };

/** Values for 4 figures where no value appears 3 times, so this attribute singles nobody out. */
function noTriple<T>(rng: Rng, pool: readonly T[]): T[] {
    for (;;) {
        const v = Array.from({ length: 4 }, () => pick(rng, pool));
        if (pool.every(x => v.filter(y => y === x).length < 3)) return v;
    }
}

export function oddPuzzle(rng: Rng, difficulty: Difficulty): FigurePuzzle {
    const attr = pick(rng, ODD_ATTR[difficulty]);
    for (;;) {
        const shapes = noTriple(rng, FLAT);
        const colors = noTriple(rng, COLORS);
        const sizes: Size[] = [2, 2, 2, 2];
        const counts = [1, 1, 1, 1];
        // The odd one is index 0; the three others share `attr`
        if (attr === 'shape') { const [s, o] = shuffled(rng, FLAT); shapes.splice(0, 4, o, s, s, s); }
        if (attr === 'color') { const [c, o] = shuffled(rng, COLORS); colors.splice(0, 4, o, c, c, c); }
        if (attr === 'size') { const s = pick(rng, [1, 3] as const); sizes.splice(0, 4, s === 1 ? 3 : 1, s, s, s); }
        if (attr === 'count') { const n = intBetween(rng, 2, 4); counts.splice(0, 4, n + pick(rng, [-1, 1]), n, n, n); }
        const figs = [0, 1, 2, 3].map(i => fig(shapes[i], colors[i], sizes[i], counts[i]));
        if (new Set(figs.map(label)).size < 4) continue;
        // "בצבע כחול" / "בגודל גדול" keep the adjective singular, so it agrees whatever the shapes are
        const why = attr === 'shape' ? `שלוש האחרות הן ${shapeName(shapes[1], true)}`
            : attr === 'color' ? `שלוש האחרות בצבע ${colorName(colors[1])}`
                : attr === 'size' ? `שלוש האחרות בגודל ${sizeName(sizes[1])}`
                    : `בשלוש התמונות האחרות יש ${counts[1]} צורות`;
        return {
            // the four options are the pictures, so the stem shows no board of its own
            kind: 'odd', board: { layout: 'row', cells: [] }, options: figs,
            explanation: `${why}, ורק ${label(figs[0])} שונה.`,
        };
    }
}
