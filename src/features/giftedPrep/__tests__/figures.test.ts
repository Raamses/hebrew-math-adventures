import { describe, it, expect } from 'vitest';
import { figureItem, pictureItem } from '../engine/pictures';
import { canon, label, type Figure } from '../engine/figures';
import { hasNiqqud, stripNiqqud } from '../engine/niqqud';
import mathNiqqud from '../content/he/math-niqqud.json';
import type { Difficulty, PrepItem } from '../types';

const SEEDS = Number(process.env.PREP_SWEEP ?? 10_000);
const DIFFS: Difficulty[] = [1, 2, 3];
const ATTRS = ['shape', 'color', 'size', 'rot', 'count'] as const;
type Attr = typeof ATTRS[number];
const same = (a: Figure, b: Figure) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/** Next value of one attribute: constant, repeating with period 2 or 3, or a constant step (count; rot mod 360). */
function nextValue(vals: readonly (string | number)[], attr: Attr): (string | number)[] {
    const out = new Set<string | number>();
    for (const p of [1, 2, 3]) if (vals.every((v, i) => i < p || v === vals[i - p])) out.add(vals[vals.length - p]);
    if (attr === 'count' || attr === 'rot') {
        const n = vals.map(Number);
        const d = n.slice(1).map((v, i) => (attr === 'rot' ? (v - n[i] + 360) % 360 : v - n[i]));
        if (d.every(x => x === d[0])) out.add(attr === 'rot' ? (n[n.length - 1] + d[0]) % 360 : n[n.length - 1] + d[0]);
    }
    return [...out];
}

/** Options a careful child could defend, worked out only from the board and the drawn options. */
function defensible(item: PrepItem): number[] {
    const opts = item.optionFigures!;
    const board = item.stem.figures;
    if (!board) {
        // odd one out: the three others share a value of some attribute that this one lacks
        return opts.flatMap((f, i) => {
            const rest = opts.filter((_, j) => j !== i).map(canon);
            return ATTRS.some(a => rest.every(r => r[a] === rest[0][a]) && canon(f)[a] !== rest[0][a]) ? [i] : [];
        });
    }
    if (board.layout === 'row') {
        const shown = board.cells.filter((c): c is Figure => c !== null).map(canon);
        const fits = (f: Figure) => ATTRS.every(a => nextValue(shown.map(s => s[a]), a).includes(canon(f)[a]));
        return opts.flatMap((f, i) => (fits(f) ? [i] : []));
    }
    const ok = (grid: Figure[]) => {
        const rows = [0, 1, 2].map(r => grid.slice(r * 3, r * 3 + 3));
        const cols = [0, 1, 2].map(c => [grid[c], grid[c + 3], grid[c + 6]]);
        const constant = (g: Figure[], a: Attr) => g.every(x => x[a] === g[0][a]);
        const allDiff = (g: Figure[], a: Attr) => new Set(g.map(x => x[a])).size === 3;
        const sizes = grid.every(x => x.size === grid[0].size && x.count === 1);
        const plain = rows.every(r => constant(r, 'shape')) && cols.every(c => constant(c, 'color'));
        const latin = [...rows, ...cols].every(g => allDiff(g, 'shape') && allDiff(g, 'color'));
        return sizes && (plain || latin);
    };
    return opts.flatMap((f, i) => (ok(board.cells.map(c => canon(c ?? f))) ? [i] : []));
}

function problems(item: PrepItem): string[] {
    const out: string[] = [];
    const say = (good: boolean, msg: string) => { if (!good) out.push(`${item.id}: ${msg}`); };
    const figs = item.optionFigures;
    say(!!figs && figs.length === 4, 'needs 4 drawn options');
    if (!figs) return out;
    say(figs.every((f, i) => !figs.some((g, j) => j > i && same(f, g))), 'two options look the same');
    say(new Set(item.options).size === 4 && item.options.every((o, i) => o === label(figs[i])), 'labels');
    const d = defensible(item);
    say(d.length === 1 && d[0] === item.answerIndex, `defensible ${JSON.stringify(d)} vs key ${item.answerIndex}: ${item.explanation}`);
    say(stripNiqqud(item.stem.textNiqqud ?? '') === item.stem.text, 'niqqud twin');
    say(figs.every(f => f.count >= 1 && f.count <= 7), 'count range');
    say(!/=/.test(item.explanation) && item.explanation.length > 10, 'explanation');
    return out;
}

describe('shape picture puzzles: 10k-seed sweep', () => {
    it.each(DIFFS)('d%i: exactly one defensible option, no two options equivalent after symmetry', d => {
        const found: string[] = [];
        for (let seed = 1; seed <= SEEDS && found.length < 5; seed++) found.push(...problems(figureItem(seed, d)));
        expect(found).toEqual([]);
    });

    it('reaches every pattern kind and spreads the answer slot', () => {
        const kinds = new Set<string>();
        const pos = [0, 0, 0, 0];
        for (let seed = 1; seed <= 3000; seed++) {
            const it3 = figureItem(seed, (1 + (seed % 3)) as Difficulty);
            pos[it3.answerIndex]++;
            const b = it3.stem.figures;
            const s = b?.cells.filter(Boolean) as Figure[] | undefined;
            kinds.add(!b ? 'odd' : b.layout === 'grid' ? 'matrix'
                : s!.some(f => f.rot !== s![0].rot) ? 'rotation' : s!.some(f => f.count !== s![0].count) ? 'count' : 'size');
        }
        expect([...kinds].sort()).toEqual(['count', 'matrix', 'odd', 'rotation', 'size']);
        pos.forEach(c => expect(c).toBeGreaterThan(600));
    });

    it('symmetry: a circle or square turned a quarter is the same figure, an arrow is not', () => {
        const base: Figure = { shape: 'square', color: 'red', size: 2, rot: 0, count: 1 };
        expect(same(base, { ...base, rot: 90 })).toBe(true);
        expect(same({ ...base, shape: 'circle' }, { ...base, shape: 'circle', rot: 180 })).toBe(true);
        expect(same({ ...base, shape: 'arrow' }, { ...base, shape: 'arrow', rot: 90 })).toBe(false);
        expect(label({ ...base, shape: 'arrow', rot: 90 })).toBe('חץ אדום בינוני שמצביע ימינה');
    });

    it('pictureItem mixes number puzzles and shape puzzles', () => {
        const items = Array.from({ length: 20 }, (_, i) => pictureItem(i + 1, 2));
        expect(items.some(i => i.stem.pictureLines)).toBe(true);
        expect(items.some(i => i.optionFigures)).toBe(true);
    });

    it('figure stems have exact niqqud twins', () => {
        for (const [plain, voc] of Object.values(mathNiqqud.figureStems)) {
            expect(hasNiqqud(plain)).toBe(false);
            expect(stripNiqqud(voc)).toBe(plain);
        }
    });
});
