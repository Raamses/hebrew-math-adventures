import reasoning from '../content/he/math-reasoning.json';
import type { Difficulty, PrepItem } from '../types';
import { joinPairs, reasonPair, type Pair } from './mathText';
import { mulberry32, pick, shuffled, shuffleOptions, type Rng } from './prng';

/**
 * C7 reasoning, part A: who has what. Four children, four pets, each child a different pet. A few
 * "has" / "has not" clues, one per line, pin down one child's pet; the child crosses out what cannot
 * be until one choice is left in a row (this child) or a column (this pet).
 * d1: two "has" clues and a "has not"; d2: one "has" clue; d3: "has not" clues only. From d2 the answer
 * takes a chain: another child's pet is found first.
 */

const KIDS = Object.keys(reasoning.logicKids) as (keyof typeof reasoning.logicKids)[];
const PETS = Object.keys(reasoning.logicPets) as (keyof typeof reasoning.logicPets)[];
type Kid = typeof KIDS[number];
type Pet = typeof PETS[number];
const kidPair = (k: Kid) => reasoning.logicKids[k] as unknown as Pair;
const toKid = (k: Kid) => reasoning.logicKidsLe[k] as unknown as Pair;
const andKid = (k: Kid) => reasoning.logicKidsVe[k] as unknown as Pair;
const petPair = (p: Pet) => reasoning.logicPets[p] as unknown as Pair;
const andPet = (p: Pet) => reasoning.logicPetsVe[p] as unknown as Pair;
const same = (s: string): Pair => [s, s];

/** A clue about child `k` (index) and pet `p` (index): has it, or has not. */
interface Clue { readonly k: number; readonly p: number; readonly has: boolean }
/** One deduction: child k gets pet p because it is the last pet left for k ('row') or k is the last child left for p ('col'). */
interface Step { readonly k: number; readonly p: number; readonly by: 'row' | 'col' }

/** Cross out from the clues, then fill every row or column with one choice left; stops once (k, p) is known. */
export function deduce(clues: readonly Clue[], askK: number): { steps: Step[]; known: number | null } {
    const can = [0, 1, 2, 3].map(() => [true, true, true, true]);
    const assign = (k: number, p: number) => {
        for (let i = 0; i < 4; i++) { can[k][i] = i === p; can[i][p] = i === k; }
    };
    for (const c of clues) if (c.has) assign(c.k, c.p); else can[c.k][c.p] = false;
    const fixed = new Set(clues.filter(c => c.has).map(c => c.k));
    const steps: Step[] = [];
    const known = () => (can[askK].filter(Boolean).length === 1 ? can[askK].indexOf(true) : null);
    for (let progress = true; progress && known() === null;) {
        progress = false;
        for (let k = 0; k < 4 && !progress; k++) {
            if (fixed.has(k) || can[k].filter(Boolean).length !== 1) continue;
            const p = can[k].indexOf(true);
            assign(k, p); fixed.add(k); steps.push({ k, p, by: 'row' }); progress = true;
        }
        for (let p = 0; p < 4 && !progress; p++) {
            const col = [0, 1, 2, 3].filter(k => can[k][p]);
            if (col.length !== 1 || fixed.has(col[0])) continue;
            assign(col[0], p); fixed.add(col[0]); steps.push({ k: col[0], p, by: 'col' }); progress = true;
        }
    }
    const k = known();
    // the asked child's row may close by crossing out alone; say that as the last step
    if (k !== null && !steps.some(s => s.k === askK)) steps.push({ k: askK, p: k, by: 'row' });
    return { steps, known: k };
}

const HAS_CLUES: Readonly<Record<Difficulty, number>> = { 1: 2, 2: 1, 3: 0 };

export function logicItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    for (let tries = 0; tries < 1000; tries++) {
        const item = tryLogic(rng, seed, difficulty);
        if (item) return item;
    }
    throw new Error(`logicItem: no puzzle for seed ${seed} d${difficulty}`);
}

function tryLogic(rng: Rng, seed: number, difficulty: Difficulty): PrepItem | null {
    const kids = shuffled(rng, KIDS).slice(0, 4);
    const pets = shuffled(rng, PETS).slice(0, 4);
    const owns = shuffled(rng, [0, 1, 2, 3]); // kid i has pet owns[i]
    const askK = pick(rng, [0, 1, 2, 3]);
    const askWho = rng() < 0.5;
    // "has" clues never name the asked child; "has not" clues are drawn until the asked pet is known
    const hasKids = shuffled(rng, [0, 1, 2, 3].filter(k => k !== askK)).slice(0, HAS_CLUES[difficulty]);
    const clues: Clue[] = hasKids.map(k => ({ k, p: owns[k], has: true }));
    const nots = shuffled(rng, [0, 1, 2, 3].flatMap(k => [0, 1, 2, 3].filter(p => p !== owns[k] && !hasKids.includes(k)).map(p => ({ k, p, has: false }))));
    for (const c of nots) {
        if (deduce(clues, askK).known !== null) break;
        clues.push(c);
    }
    // drop clues the answer does not need, so every line counts
    for (let i = clues.length - 1; i >= 0; i--) {
        if (clues[i].has) continue;
        const without = clues.filter((_, j) => j !== i);
        if (deduce(without, askK).known !== null) clues.splice(i, 1);
    }
    const { steps } = deduce(clues, askK);
    // d2-3 need a chain: another child's pet first, then the asked one (about 27% / 39% of draws pass)
    if (steps.length < Math.min(difficulty, 2) || !clues.some(c => !c.has)) return null;

    const listOf = (xs: readonly Pair[], last: Pair): Pair => joinPairs(...xs.flatMap((x, i) => (i === 0 ? [x] : [same(', '), x])), same(' '), last);
    const intro = joinPairs(
        reasonPair('logic', 'intro'),
        listOf(kids.slice(0, 3).map(kidPair), andKid(kids[3])),
        reasonPair('logic', 'introPets'),
        listOf(pets.slice(0, 3).map(petPair), andPet(pets[3])),
        same('.\n'),
    );
    const lines = shuffled(rng, clues).map(c => joinPairs(toKid(kids[c.k]), reasonPair('logic', c.has ? 'has' : 'hasNot'), petPair(pets[c.p]), same('.\n')));
    const ask = askWho
        ? joinPairs(reasonPair('logic', 'askWho'), petPair(pets[owns[askK]]), same('?'))
        : joinPairs(reasonPair('logic', 'askWhat'), toKid(kids[askK]), same('?'));
    const text = joinPairs(intro, ...lines, ask);

    const opts = askWho ? [askK, ...[0, 1, 2, 3].filter(k => k !== askK)].map(k => kidPair(kids[k]))
        : [owns[askK], ...[0, 1, 2, 3].filter(p => p !== owns[askK])].map(p => petPair(pets[p]));
    const { options, answerIndex } = shuffleOptions(rng, opts.map(o => o[0]), 0);
    const kidName = (k: number) => kidPair(kids[k])[0];
    const petName = (p: number) => petPair(pets[p])[0];
    const and = (xs: string[]) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} ו${xs[xs.length - 1]}`);
    // each step says why: a pet another child already has, or a "has not" clue
    const owner = new Map(clues.filter(c => c.has).map(c => [c.p, c.k]));
    const ruledOut = (k: number, p: number) => clues.some(c => !c.has && c.k === k && c.p === p);
    const said = steps.map(s => {
        const others = [0, 1, 2, 3].filter(x => x !== (s.by === 'row' ? s.p : s.k));
        const why = s.by === 'row'
            ? [...others.filter(p => owner.has(p) && !ruledOut(s.k, p)).map(p => `ה${petName(p)} של ${kidName(owner.get(p)!)}`),
                ...(others.some(p => ruledOut(s.k, p)) ? [`ל${kidName(s.k)} ${and(others.filter(p => ruledOut(s.k, p)).map(p => `אין ${petName(p)}`))}`] : [])]
            : others.map(k => (ruledOut(k, s.p) ? `ל${kidName(k)} אין ${petName(s.p)}` : `ל${kidName(k)} יש ${petName(owns[k])}`));
        owner.set(s.p, s.k);
        return `${why.join(', ')}, אז ${s.by === 'row' ? `ל${kidName(s.k)} יש ${petName(s.p)}` : `ה${petName(s.p)} של ${kidName(s.k)}`}`;
    });
    return {
        id: `math-logic:${difficulty}:${seed}`, kind: 'math-logic', section: 'math', skill: 'logic-grid', difficulty,
        stem: { text: text[0], textNiqqud: text[1] },
        options, optionsNiqqud: options.map(o => opts.find(x => x[0] === o)![1]), answerIndex,
        explanation: `מוחקים מה שלא יכול להיות. ${said.join('. ')}.`,
        source: 'procedural', seed,
    };
}
