import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PrepProgressProvider, usePrepProgress } from '../context/PrepProgressContext';
import { emptyPrepProgress, loadPrepProgress, migratePrepProgress, prepStorageKey, savePrepProgress } from '../engine/storage';
import { pickOptions, pickText, stripNiqqud } from '../engine/niqqud';
import { ItemStem } from '../components/ItemStem';
import { exerciseItem, missingItem, wordItem } from '../engine/arithmetic';
import { pictureItem } from '../engine/pictures';

const wrapper = ({ children }: { children: ReactNode }) => <PrepProgressProvider profileId="kid">{children}</PrepProgressProvider>;

describe('niqqud preference', () => {
    beforeEach(() => localStorage.clear());

    it('is on by default (field absent) and a stored false survives migrate', () => {
        expect(migratePrepProgress({ ...emptyPrepProgress() }).niqqud).toBeUndefined();
        expect(migratePrepProgress({ ...emptyPrepProgress(), niqqud: false }).niqqud).toBe(false);
        const { result } = renderHook(() => usePrepProgress(), { wrapper });
        expect(result.current.niqqud).toBe(true);
    });

    it('setNiqqud persists per profile and is read back on the next load', () => {
        const { result } = renderHook(() => usePrepProgress(), { wrapper });
        act(() => result.current.setNiqqud(false));
        expect(result.current.niqqud).toBe(false);
        expect(loadPrepProgress('kid').niqqud).toBe(false);
        expect(JSON.parse(localStorage.getItem(prepStorageKey('kid'))!).niqqud).toBe(false);
        savePrepProgress('kid', { ...emptyPrepProgress(), niqqud: true });
        const again = renderHook(() => usePrepProgress(), { wrapper });
        expect(again.result.current.niqqud).toBe(true);
    });
});

describe('niqqud selection', () => {
    it('pickText / pickOptions use the twin only when on and complete', () => {
        expect(pickText(true, 'שלום', 'שָׁלוֹם')).toBe('שָׁלוֹם');
        expect(pickText(false, 'שלום', 'שָׁלוֹם')).toBe('שלום');
        expect(pickText(true, 'שלום', undefined)).toBe('שלום');
        expect(pickOptions(true, ['א', 'ב'], ['אָ', 'בָּ'])).toEqual(['אָ', 'בָּ']);
        expect(pickOptions(true, ['א', 'ב'], ['אָ'])).toEqual(['א', 'ב']);
        expect(pickOptions(false, ['א', 'ב'], ['אָ', 'בָּ'])).toEqual(['א', 'ב']);
    });

    it('ItemStem renders the vocalized passage and question when on, plain when off', () => {
        const stem = {
            text: 'מה קרה?', textNiqqud: 'מָה קָרָה?',
            passage: { id: 'p', title: 'כותרת', text: 'טקסט', titleNiqqud: 'כּוֹתֶרֶת', textNiqqud: 'טֶקְסְט' },
        };
        const { rerender } = render(<ItemStem stem={stem} niqqud />);
        expect(screen.getByTestId('prep-question').textContent).toBe('מָה קָרָה?');
        expect(screen.getByTestId('prep-passage').textContent).toContain('טֶקְסְט');
        rerender(<ItemStem stem={stem} niqqud={false} />);
        expect(screen.getByTestId('prep-question').textContent).toBe('מה קרה?');
        expect(screen.getByTestId('prep-passage').textContent).toContain('טקסט');
    });

    it('math stems carry a vocalized twin that strips back to the plain text', () => {
        for (let seed = 1; seed <= 300; seed++) {
            for (const item of [exerciseItem(seed, 2), missingItem(seed, 2), wordItem(seed, 2), pictureItem(seed, 2)]) {
                expect(item.stem.textNiqqud, item.id).toBeDefined();
                expect(stripNiqqud(item.stem.textNiqqud!)).toBe(item.stem.text);
            }
        }
    });
});
