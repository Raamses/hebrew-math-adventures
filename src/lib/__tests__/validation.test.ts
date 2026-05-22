import { describe, it, expect } from 'vitest';
import { isValidProfileName } from '../validation';

describe('isValidProfileName', () => {
    it('should return true for valid English names', () => {
        expect(isValidProfileName('John Doe')).toBe(true);
        expect(isValidProfileName('Jane123')).toBe(true);
    });

    it('should return true for valid Hebrew names', () => {
        expect(isValidProfileName('ישראל ישראלי')).toBe(true);
        expect(isValidProfileName('יוסי123')).toBe(true);
    });

    it('should return true for mixed English and Hebrew names', () => {
        expect(isValidProfileName('John יוסי')).toBe(true);
    });

    it('should return false for empty or whitespace names', () => {
        expect(isValidProfileName('')).toBe(false);
        expect(isValidProfileName('   ')).toBe(false);
    });

    it('should return false for names longer than 30 characters', () => {
        expect(isValidProfileName('a'.repeat(31))).toBe(false);
    });

    it('should return false for names with special characters', () => {
        expect(isValidProfileName('John!@#')).toBe(false);
        expect(isValidProfileName('John; DROP TABLE users;')).toBe(false);
        expect(isValidProfileName('<script>alert(1)</script>')).toBe(false);
    });

    it('should return true for names with digits', () => {
        expect(isValidProfileName('Player 1')).toBe(true);
    });
});
