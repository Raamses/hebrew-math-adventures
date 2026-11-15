import { intBetween, type Rng } from './prng';

/** The typical slips a 7-year-old makes; each wrong option is exactly one of these. */
export type Slip = 'off-by-one' | 'off-by-ten' | 'wrong-operation' | 'digit-swap' | 'near';

export interface DistractorInput {
    readonly answer: number;
    /** The result of doing the other operation (a - b instead of a + b), when it applies. */
    readonly wrongOp?: number;
    readonly max?: number;
}

const swapDigits = (n: number): number | null => {
    if (n < 10 || n > 99) return null;
    const tens = Math.floor(n / 10), ones = n % 10;
    return ones === tens || ones === 0 ? null : ones * 10 + tens;
};

/**
 * Three distinct, non-negative wrong answers, all different from `answer`. Prefers meaningful slips
 * (digit swap, wrong operation, carry/borrow error = off by ten, off by one), then fills with near numbers.
 */
export function numericDistractors(rng: Rng, { answer, wrongOp, max = 100 }: DistractorInput): number[] {
    const candidates: number[] = [];
    const swap = swapDigits(answer);
    if (swap !== null) candidates.push(swap);
    if (wrongOp !== undefined) candidates.push(wrongOp);
    candidates.push(rng() < 0.5 ? answer + 10 : answer - 10);
    candidates.push(rng() < 0.5 ? answer + 1 : answer - 1);
    candidates.push(answer + 1, answer - 1, answer + 10, answer - 10, answer + 2, answer - 2);

    const out: number[] = [];
    for (const c of candidates) {
        if (out.length === 3) break;
        if (c >= 0 && c <= max + 10 && c !== answer && !out.includes(c)) out.push(c);
    }
    while (out.length < 3) {
        const c = answer + intBetween(rng, -5, 5);
        if (c >= 0 && c !== answer && !out.includes(c)) out.push(c);
    }
    return out;
}
