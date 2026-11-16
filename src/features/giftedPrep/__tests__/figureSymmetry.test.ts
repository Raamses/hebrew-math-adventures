import { describe, it, expect } from 'vitest';
import { canon, COLORS, label, SHAPES, type Figure, type Rotation, type Shape, type Size } from '../engine/figures';
import { PATH } from '../engine/figurePaths';
import { TURNS, turn, type Turn } from '../engine/figureAnalogy';

/**
 * Symmetry canonicalization checked against the drawing itself: the corners of each straight-edged outline
 * (figurePaths.ts) are moved exactly as PrepFigure's SVG transform moves them (mirror, then rotate about the
 * centre). Two orientations look the same exactly when the corner sets coincide, and that must be exactly
 * when `canon` (and so `label`) says they are the same figure.
 */

type Pt = readonly [number, number];
const POLY: readonly Exclude<Shape, 'circle' | 'star' | 'heart'>[] = ['square', 'triangle', 'arrow', 'flag'];
const ROTS: readonly Rotation[] = [0, 90, 180, 270];

/** Corners of an absolute M/L/H/V/z path. */
function corners(d: string): Pt[] {
    const out: Pt[] = [];
    let [x, y] = [0, 0];
    for (const [, cmd, args] of d.matchAll(/([MLHVz])([^MLHVz]*)/g)) {
        const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (cmd === 'M' || cmd === 'L') [x, y] = [n[0], n[1]];
        else if (cmd === 'H') x = n[0];
        else if (cmd === 'V') y = n[0];
        else continue;
        out.push([x, y]);
    }
    return out;
}

const rotate = ([x, y]: Pt, deg: number): Pt => {
    const r = (deg * Math.PI) / 180;
    const [dx, dy] = [x - 20, y - 20];
    // SVG y points down, so a positive angle turns clockwise on screen
    return [20 + dx * Math.cos(r) - dy * Math.sin(r), 20 + dx * Math.sin(r) + dy * Math.cos(r)];
};
const key = (pts: readonly Pt[]) => [...new Set(pts.map(([x, y]) => `${Math.round(x * 1e6) / 1e6},${Math.round(y * 1e6) / 1e6}`))].sort().join(' ');

/** What PrepFigure draws: mirror left-right if flip, then rotate clockwise by rot. */
const drawn = (f: Figure): Pt[] => corners(PATH[f.shape as typeof POLY[number]])
    .map(([x, y]): Pt => (f.flip ? [40 - x, y] : [x, y]))
    .map(p => rotate(p, f.rot));

/** The same page operation done on the corners directly. */
const PAGE: Readonly<Record<Turn, (p: Pt) => Pt>> = {
    rot90: p => rotate(p, 90), rot180: p => rotate(p, 180), rot270: p => rotate(p, 270),
    mirrorLR: ([x, y]) => [40 - x, y], mirrorUD: ([x, y]) => [x, 40 - y],
};

const fig = (shape: Shape, rot: Rotation, flip: boolean): Figure => ({ shape, color: 'red', size: 2, rot, count: 1, ...(flip ? { flip } : {}) });
const orientations = (shape: Shape) => ROTS.flatMap(r => [false, true].map(m => fig(shape, r, m)));

describe('symmetry canonicalization matches the drawing', () => {
    it.each(POLY)('%s: two orientations get one label exactly when they draw the same corners', shape => {
        const all = orientations(shape);
        for (const f of all) for (const g of all) {
            expect(label(f) === label(g), `${label(f)} vs ${label(g)}`).toBe(key(drawn(f)) === key(drawn(g)));
        }
    });

    it.each(POLY)('%s: turn() moves the drawing exactly like the page operation', shape => {
        for (const f of orientations(shape)) for (const t of TURNS) {
            expect(key(drawn(turn(f, t))), `${t} of ${label(f)}`).toBe(key(drawn(f).map(PAGE[t])));
        }
    });

    it('distinct orientations per shape: circle/square 1, triangle/arrow 4, flag 8', () => {
        const count = (s: Shape) => new Set(orientations(s).map(label)).size;
        expect(Object.fromEntries(SHAPES.map(s => [s, count(s)]))).toEqual({
            circle: 1, square: 1, star: 1, heart: 1, triangle: 4, arrow: 4, flag: 8,
        });
    });

    it('label is a faithful key: one label per canonical figure, and back', () => {
        const byLabel = new Map<string, string>();
        for (const s of SHAPES) for (const c of COLORS) for (const z of [1, 2, 3] as Size[]) for (const f of orientations(s)) {
            const g = { ...f, color: c, size: z };
            const k = JSON.stringify(canon(g));
            expect(byLabel.get(label(g)) ?? k).toBe(k);
            byLabel.set(label(g), k);
        }
        expect(new Set(byLabel.values()).size).toBe(byLabel.size);
    });

    it('names the flag by where its pole points and where the cloth hangs', () => {
        expect(label(fig('flag', 0, false))).toBe('דגל אדום בינוני שמצביע למעלה והבד ימינה');
        expect(label(fig('flag', 0, true))).toBe('דגל אדום בינוני שמצביע למעלה והבד שמאלה');
        expect(label(fig('flag', 90, false))).toBe('דגל אדום בינוני שמצביע ימינה והבד למטה');
    });
});
