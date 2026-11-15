import { shuffled, type Rng } from './prng';

/**
 * Bag-deck selection (vault/rules/math-curriculum.md): draw every id once, in a seeded random order,
 * before any id repeats. `preferUnseen` moves ids the child has not seen recently to the front.
 */
export class BagDeck<T extends { readonly id: string }> {
    private bag: T[] = [];
    private readonly rng: Rng;
    private readonly pool: readonly T[];
    private readonly recent: string[] = [];
    private readonly seen: ReadonlySet<string>;

    constructor(pool: readonly T[], rng: Rng, seen: ReadonlySet<string> = new Set()) {
        this.pool = pool;
        this.rng = rng;
        this.seen = seen;
    }

    private refill(): void {
        const mixed = shuffled(this.rng, this.pool);
        const unseen = mixed.filter(x => !this.seen.has(x.id));
        const seenItems = mixed.filter(x => this.seen.has(x.id));
        this.bag = [...unseen, ...seenItems];
    }

    /** Next item; never one of the last 3 drawn when the pool allows it (repetition guard). */
    draw(): T {
        if (this.pool.length === 0) throw new Error('BagDeck: empty pool');
        if (this.bag.length === 0) this.refill();
        let idx = this.bag.findIndex(x => !this.recent.includes(x.id));
        if (idx < 0) idx = 0;
        const [item] = this.bag.splice(idx, 1);
        this.recent.push(item.id);
        if (this.recent.length > 3) this.recent.shift();
        return item;
    }

    drawMany(n: number): T[] {
        return Array.from({ length: n }, () => this.draw());
    }
}
