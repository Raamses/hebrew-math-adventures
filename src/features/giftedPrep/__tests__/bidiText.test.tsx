import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BidiText } from '../components/BidiText';
import { ItemStem } from '../components/ItemStem';
import { ltr } from '../engine/arithmeticExplain';
import { MAKERS } from '../engine/arithmetic';
import { triangleItem } from '../engine/mathReasoning4';

describe('BidiText keeps each equation in one LTR box', () => {
    it('wraps every ltr() run, leaves the Hebrew as text, and keeps the text content unchanged', () => {
        const text = triangleItem(1000, 2).explanation;
        const runs = text.match(/\u2066[^\u2069]*\u2069/g)!;
        expect(runs.length).toBeGreaterThan(1);
        const { container } = render(<p><BidiText text={text} /></p>);
        expect(container.textContent).toBe(text);
        const boxes = screen.getAllByTestId('prep-ltr-run');
        expect(boxes.map(b => b.textContent)).toEqual(runs);
        for (const b of boxes) {
            expect(b.getAttribute('dir')).toBe('ltr');
            // moves to the next line whole; breaks inside (left to right) only when wider than the line
            expect(b.className).toContain('inline-block');
            expect(b.className).toContain('max-w-full');
        }
    });

    it('text without equations renders as plain text; empty text renders nothing', () => {
        const { container } = render(<p><BidiText text="שָׁלוֹם" /></p>);
        expect(container.querySelector('span')).toBeNull();
        expect(container.textContent).toBe('שָׁלוֹם');
        expect(render(<p data-testid="empty"><BidiText /></p>).getByTestId('empty').textContent).toBe('');
    });

    it('the question paragraph uses it too', () => {
        render(<ItemStem stem={{ text: `כַּמָּה זֶה ${ltr('7 + 8')}?` }} niqqud />);
        expect(screen.getByTestId('prep-question').querySelector('[data-testid="prep-ltr-run"]')!.textContent).toBe(ltr('7 + 8'));
    });

    it('every generated explanation and question has balanced isolates, so no equation box is left open', () => {
        for (const make of new Set(MAKERS)) {
            for (let seed = 1; seed <= 150; seed++) {
                for (const d of [1, 2, 3] as const) {
                    const item = make(seed, d);
                    for (const t of [item.explanation, item.explanationNiqqud, item.stem.text, item.stem.textNiqqud]) {
                        if (!t) continue;
                        expect(t.match(/\u2066/g)?.length ?? 0, `${make.name} ${seed} d${d}`).toBe(t.match(/\u2069/g)?.length ?? 0);
                        expect(t, `${make.name} ${seed} d${d}`).not.toMatch(/\u2066[^\u2069]*\u2066/);
                    }
                }
            }
        }
    }, 120_000);
});
