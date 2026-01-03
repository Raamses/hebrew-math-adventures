/**
 * Utility class for standardized random number generation and problem helpers.
 */
export class RandomUtils {
    /**
     * Returns a random integer between min (inclusive) and max (exclusive).
     * @param min Inclusive minimum
     * @param max Exclusive maximum
     */
    static intInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive).
     * @param min Inclusive minimum
     * @param max Inclusive maximum
     */
    static intInclusive(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Returns true with the specified probability (0.0 to 1.0).
     */
    static chance(probability: number): boolean {
        return Math.random() < probability;
    }

    /**
     * Returns a random element from an array.
     */
    static pickOne<T>(items: T[]): T {
        return items[Math.floor(Math.random() * items.length)];
    }

    /**
     * Generates a UUID.
     */
    static generateId(): string {
        return crypto.randomUUID();
    }
}
