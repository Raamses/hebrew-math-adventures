import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FigureBoardView } from '../components/PrepFigure';
import { label, type Figure, type FigureBoard } from '../engine/figures';

const f = (color: Figure['color'], rot: Figure['rot']): Figure => ({ shape: 'flag', color, size: 2, rot, count: 1 });
const [A, B, C] = [f('red', 0), f('red', 90), f('blue', 0)];
const board: FigureBoard = { layout: 'analogy', cells: [A, B, C, null] };

/**
 * The A:B::C:? row must read right to left like the booklet: dir="rtl" pinned on the row (so the browser puts
 * the first DOM child rightmost), pair 1 = A then B, pair 2 = C then "?", and the arrow is decorative.
 */
describe('analogy row (RTL)', () => {
    it('pins dir="rtl" and keeps A, B, C, ? in reading order', () => {
        // even inside an LTR page the row reads right to left
        render(<div dir="ltr"><FigureBoardView board={board} /></div>);
        const row = screen.getByTestId('prep-figures');
        expect(row.getAttribute('dir')).toBe('rtl');
        expect(row.dataset.layout).toBe('analogy');
        const names = (n: number) => within(screen.getByTestId(`prep-analogy-pair-${n}`))
            .getAllByLabelText(/./).map(el => el.getAttribute('aria-label'));
        expect(names(1)).toEqual([label(A), label(B)]);
        expect(names(2)).toEqual([label(C), '?']);
        // pair 1 comes before pair 2 in the DOM, with the hidden "כמו" between them for screen readers
        expect(row.textContent).toContain('כמו');
        const [p1, p2] = [screen.getByTestId('prep-analogy-pair-1'), screen.getByTestId('prep-analogy-pair-2')];
        expect(p1.compareDocumentPosition(p2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(row.querySelectorAll('svg.lucide-arrow-left[aria-hidden="true"]')).toHaveLength(2);
    });
});
