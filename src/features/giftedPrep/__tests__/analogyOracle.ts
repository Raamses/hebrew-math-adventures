import { canon, COLORS, label, SHAPES, type Figure, type Rotation, type Size } from '../engine/figures';
import type { PrepItem } from '../types';

/**
 * Independent judge for "A is to B as C is to ?" items, built only from what the child sees (A, B, C and the
 * drawn options), never from the generator's rule. A rule changes ONE attribute; the catalog is wider than
 * what the generator uses (all 8 turns and mirrors incl. the diagonals, size set or shift, colour set or swap,
 * shape set or swap), so an A→B that two different rules explain, with different answers for C, is caught.
 */

type Rule = (f: Figure) => Figure | null;
const norm = (d: number) => ((((d % 360) + 360) % 360) as Rotation);

/** D4 acting on the page: Rot(r)·M^m applied to a figure drawn as Rot(rot)·M^flip. */
const orient = (r: number, m: boolean): Rule => f => ({ ...f, rot: norm(r + (m ? -f.rot : f.rot)), flip: m !== !!f.flip });

const SIZES: readonly Size[] = [1, 2, 3];
const RULES: readonly Rule[] = [
    ...[0, 90, 180, 270].flatMap(r => [true, false].map(m => orient(r, m))),
    ...SIZES.map((s): Rule => f => ({ ...f, size: s })),
    ...[-2, -1, 1, 2].map((d): Rule => f => (SIZES.includes((f.size + d) as Size) ? { ...f, size: (f.size + d) as Size } : null)),
    ...COLORS.map((c): Rule => f => ({ ...f, color: c })),
    ...COLORS.flatMap(x => COLORS.map((y): Rule => f => ({ ...f, color: f.color === x ? y : f.color === y ? x : f.color }))),
    ...SHAPES.map((s): Rule => f => ({ ...f, shape: s })),
    ...SHAPES.flatMap(x => SHAPES.map((y): Rule => f => ({ ...f, shape: f.shape === x ? y : f.shape === y ? x : f.shape }))),
];

/** Two figures are the same answer exactly when their labels match (label is injective on canon, see figureSymmetry.test). */
const key = (f: Figure) => label(f);

/** Every answer some one-attribute rule that turns A into B gives for C (as labels). */
export function analogyAnswers(a: Figure, b: Figure, c: Figure): Set<string> {
    const out = new Set<string>();
    for (const rule of RULES) {
        const ra = rule(a);
        const rc = rule(c);
        if (ra && rc && key(ra) === key(b)) out.add(key(rc));
    }
    return out;
}

/** Option indexes the oracle accepts (for figures.test's mixed sweep). */
export function analogyDefensible(item: PrepItem): number[] {
    const [a, b, c] = (item.stem.figures?.cells ?? []).filter((x): x is Figure => x !== null);
    const answers = analogyAnswers(a, b, c);
    return (item.optionFigures ?? []).flatMap((f, i) => (answers.has(key(f)) ? [i] : []));
}

/** Which visible attributes two figures differ in; orientation (turn + mirror) counts as one. */
export function differences(x: Figure, y: Figure): string[] {
    const [p, q] = [canon(x), canon(y)];
    const diff: string[] = [];
    if (p.shape !== q.shape) diff.push('shape');
    if (p.color !== q.color) diff.push('color');
    if (p.size !== q.size) diff.push('size');
    if (p.count !== q.count) diff.push('count');
    if (p.shape === q.shape && (p.rot !== q.rot || !!p.flip !== !!q.flip)) diff.push('orientation');
    return diff;
}
