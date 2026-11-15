import { RandomUtils } from '@/engines/utils/ProblemUtils';

/** A seeded PRNG: same seed, same sequence. Returns floats in [0, 1). */
export type Rng = () => number;

/** mulberry32: small, fast, good enough for item generation (not for security). */
export function mulberry32(seed: number): Rng {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A fresh session seed from the crypto source (RandomUtils.secureIntInRange, #257). */
export function newSeed(): number {
    return RandomUtils.secureIntInRange(1, 2 ** 31 - 1);
}

/** Integer in [min, max] inclusive. */
export function intBetween(rng: Rng, min: number, max: number): number {
    return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
    return items[Math.floor(rng() * items.length)];
}

/** Fisher-Yates on a copy. */
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/**
 * Shuffle options whose correct answer is `options[correctIndex]`.
 * Returns the shuffled options and the new index of the correct answer.
 */
export function shuffleOptions(
    rng: Rng,
    options: readonly string[],
    correctIndex: number,
): { options: string[]; answerIndex: number } {
    const order = shuffled(rng, options.map((_, i) => i));
    return { options: order.map(i => options[i]), answerIndex: order.indexOf(correctIndex) };
}
