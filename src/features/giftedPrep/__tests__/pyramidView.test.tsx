import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ItemStem } from '../components/ItemStem';
import { pyramidItem } from '../engine/mathReasoning2';
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
