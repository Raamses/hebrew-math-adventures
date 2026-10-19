import { describe, expect, it } from 'vitest';
import { blitzEquationDisplay } from '../equationDisplay';

describe('blitzEquationDisplay', () => {
    it('strips the trailing ? when the unknown is the result', () => {
        expect(blitzEquationDisplay('12 + 7 = ?')).toBe('12 + 7 =');
    });
    it('strips the trailing ? with surrounding whitespace', () => {
        expect(blitzEquationDisplay('  12 + 7 = ?   ')).toBe('12 + 7 =');
    });
    it('leaves a leading-operand unknown untouched', () => {
        expect(blitzEquationDisplay('? + 5 = 12')).toBe('? + 5 = 12');
    });
    it('leaves a middle-operand unknown untouched', () => {
        expect(blitzEquationDisplay('7 + ? = 12')).toBe('7 + ? = 12');
    });
    it('leaves subtraction operand unknowns untouched', () => {
        expect(blitzEquationDisplay('12 - ? = 7')).toBe('12 - ? = 7');
    });
    it('leaves operator-only unknowns untouched', () => {
        expect(blitzEquationDisplay('? + ? = 12')).toBe('? + ? = 12');
    });
    it('leaves plain expressions without unknowns untouched', () => {
        expect(blitzEquationDisplay('12 + 7')).toBe('12 + 7');
    });
    it('handles empty input safely', () => {
        expect(blitzEquationDisplay('')).toBe('');
    });
});
