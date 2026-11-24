import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ItemStem } from '../components/ItemStem';
import { pyramidItem } from '../engine/mathReasoning2';
import { scalesItem, triangleItem } from '../engine/mathReasoning4';
import { mistakeDetails } from '../engine/mistakeDetails';
import { stemKey } from '../engine/sections';

describe('number pyramid rendering', () => {
    it('draws the rows as bricks, top row first, inside an LTR block', () => {
        const item = pyramidItem(1222, 3);
        render(<ItemStem stem={item.stem} niqqud />);
        const box = screen.getByTestId('prep-pyramid');
        expect(box.getAttribute('dir')).toBe('ltr');
        const rows = [...box.children].map(r => [...r.children].map(b => b.textContent));
        expect(rows).toEqual(item.stem.pyramid!.map(r => [...r]));
        expect(rows.map(r => r.length)).toEqual([1, 2, 3]);
        // the empty bricks and the asked one are named for screen readers
        expect(screen.getAllByLabelText('ריק')).toHaveLength(2);
        expect(screen.getByLabelText('סימן שאלה')).toBeTruthy();
    });

    it('the parent view and the repeat guard read the pyramid, not only the shared question text', () => {
        const a = pyramidItem(1222, 3), b = pyramidItem(1223, 3);
        expect(mistakeDetails(a, null).question).toMatch(/^\d+ \/ ◻ ◻ \/ \d+ \? \d+$/);
        expect(stemKey(a)).not.toBe(stemKey(b));
    });
});

describe('magic triangle rendering', () => {
    it('draws 6 circles in stem order, the asked one marked, inside an LTR block', () => {
        const item = triangleItem(1037, 2);
        render(<ItemStem stem={item.stem} niqqud />);
        const box = screen.getByTestId('prep-triangle');
        expect(box.getAttribute('dir')).toBe('ltr');
        expect(box.className).toContain('unicode-bidi-isolate');
        const cells = screen.getAllByTestId('prep-triangle-cell').map(c => c.textContent);
        expect(cells).toEqual([...item.stem.triangle!]);
        expect(cells.filter(c => c === '?')).toHaveLength(1);
    });

    it('the parent view reads a filled triangle; an empty one falls back to the question text', () => {
        expect(mistakeDetails(triangleItem(1037, 2), null).question).toMatch(/^▲ (\d+|\?)( (\d+|\?)){5}$/);
        for (let seed = 1; seed <= 200; seed++) {
            const it = triangleItem(seed, 3);
            if (it.stem.triangle!.every(c => c === '')) expect(mistakeDetails(it, null).question).toBe(it.stem.text);
        }
    });
});

describe('multi-line question text (scales ordering)', () => {
    it('keeps one comparison per line: the text has the line breaks and the paragraph preserves them', () => {
        for (const seed of [1000, 1037, 1074]) {
            for (const d of [1, 3] as const) {
                const item = scalesItem(seed, d);
                if (!/הכי (כבד|קל)/.test(item.stem.text!)) continue;
                const { unmount } = render(<ItemStem stem={item.stem} niqqud />);
                const q = screen.getByTestId('prep-question');
                expect(q.className).toContain('whitespace-pre-line');
                // three comparisons, each ending its own line, then the question
                expect(q.textContent!.split('\n')).toHaveLength(4);
                unmount();
            }
        }
    });
});
