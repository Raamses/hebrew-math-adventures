import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FigureBoardView, PrepFigure } from '../components/PrepFigure';
import { analogyPuzzle } from '../engine/figureAnalogy';
import { figureTransform } from '../engine/figurePaths';
import { label, type Figure } from '../engine/figures';
import { mulberry32 } from '../engine/prng';

/** A real d3 board (from the generator) whose A is a mirrored flag, so the mirror render path is exercised. */
function mirroredBoard() {
    for (let seed = 1; ; seed++) {
        const board = analogyPuzzle(mulberry32(seed), 3).board;
        if (board.cells[0]?.flip) return board;
    }
}

const transformOf = (img: Element) => img.querySelector('svg g')?.getAttribute('transform');

/**
 * The A:B::C:? row must read right to left like the booklet: dir="rtl" pinned on the row (so the browser puts
 * the first DOM child rightmost), pair 1 = A then B, pair 2 = C then "?", and the arrow is decorative.
 */
describe('analogy row (RTL)', () => {
    it('pins dir="rtl" and keeps A, B, C, ? in reading order', () => {
        const board = mirroredBoard();
        const [A, B, C] = board.cells.filter((x): x is Figure => x !== null);
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
        // the mirrored flag is drawn with the shared transform (proved on the outline in figureSymmetry.test)
        const a = within(p1).getAllByRole('img')[0];
        expect(transformOf(a)).toBe(figureTransform(A));
        expect(transformOf(a)).toMatch(/scale\(-0\.\d+ 0\.\d+\)/);
    });

    it('draws every figure with figureTransform, mirrored only when flip is set', () => {
        const flag: Figure = { shape: 'flag', color: 'green', size: 3, rot: 90, count: 1 };
        for (const fig of [flag, { ...flag, flip: true }]) {
            const { container, unmount } = render(<PrepFigure fig={fig} />);
            expect(transformOf(container)).toBe(figureTransform(fig));
            unmount();
        }
        expect(figureTransform({ ...flag, flip: true })).toContain('scale(-1 1)');
        expect(figureTransform(flag)).toContain('scale(1 1)');
    });
});
