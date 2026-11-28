import type { Difficulty, PrepItem } from '../types';
import { ltr } from './arithmeticExplain';
import { numericItem } from './mathBuild';
import { fillPair, reasonPair } from './mathText';
import { intBetween, mulberry32, type Rng } from './prng';

/**
 * C7 reasoning, part B. Fair sharing: to even out two piles you move half the gap, not the gap; with
 * three, the one above the middle gives what it has over the fair share. Heads and legs: start as if
 * every animal had the fewer legs, then each extra pair of legs is one animal of the other kind.
 */

const stem = ({ text, textNiqqud }: ReturnType<typeof fillPair>) => ({ text: text!, textNiqqud: textNiqqud! });

// ── Fair sharing ──

function giveItem(rng: Rng, seed: number, difficulty: Difficulty): PrepItem {
    const half = intBetween(rng, 1, difficulty === 1 ? 5 : 12);
    const b = intBetween(rng, 2, difficulty === 1 ? 10 : 30); // from 2: "1 מדבקות" is not Hebrew
    const a = b + 2 * half;
    return numericItem(rng, seed, difficulty, {
        kind: 'math-equalize', skill: 'fair-share',
        stem: stem(fillPair(reasonPair('equalize', 'give'), { a, b })),
        answer: half,
        slips: [2 * half /* moved the whole gap */, b + half /* wrote what each one ends with */, half + 1, half - 1],
        explanation: `לרוני יש יותר מלגל ב־${ltr(`${a} − ${b} = ${2 * half}`)}. כל מדבקה שעוברת מקטינה את ההפרש ב־2: `
            + `לרוני אחת פחות, ולגל אחת יותר. לכן מעבירים חצי מההפרש: ${ltr(`${half} + ${half} = ${2 * half}`)}, כלומר ${half}. `
            + `ואז לשניהם ${b + half}.`,
    });
}

function afterItem(rng: Rng, seed: number, difficulty: Difficulty): PrepItem {
    const k = intBetween(rng, 2, 12);
    return numericItem(rng, seed, difficulty, {
        kind: 'math-equalize', skill: 'fair-share',
        stem: stem(fillPair(reasonPair('equalize', 'after'), { k })),
        answer: 2 * k,
        slips: [k /* counted only what Roni lost */, k + 1, 2 * k + 1, 2 * k - 1],
        explanation: `לרוני ירדו ${k} ולגל נוספו ${k}, אז בהתחלה לרוני היו ${k} יותר ממה שיש לו עכשיו, ולגל ${k} פחות. `
            + `ההפרש בהתחלה: ${ltr(`${k} + ${k} = ${2 * k}`)}.`,
    });
}

function threeItem(rng: Rng, seed: number, difficulty: Difficulty): PrepItem {
    for (;;) {
        const fair = intBetween(rng, 6, 20);
        const b = fair - intBetween(rng, 1, 6);
        const c = fair - intBetween(rng, 1, 6);
        const a = 3 * fair - b - c;
        if (b === c || b < 2 || c < 2) continue;
        const give = a - fair;
        return numericItem(rng, seed, difficulty, {
            kind: 'math-equalize', skill: 'fair-share',
            stem: stem(fillPair(reasonPair('equalize', 'three'), { a, b, c })),
            answer: give,
            slips: [a - Math.min(b, c) /* gave the poorest the whole gap */, fair /* wrote the fair share */, a + b + c, give + 1, give - 1],
            explanation: `ביחד יש להם ${ltr(`${a} + ${b} + ${c} = ${a + b + c}`)} גולות. כשמחלקים לשלושה שווה בשווה, לכל אחד ${fair}, `
                + `כי ${ltr(`${fair} + ${fair} + ${fair} = ${a + b + c}`)}. לרוני יש ${a}, אז מעבירים ממנו ${ltr(`${a} − ${fair} = ${give}`)}: `
                + `${fair - b} לגל ו־${fair - c} לנועה.`,
        });
    }
}

export function equalizeItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    if (difficulty === 1) return giveItem(rng, seed, difficulty);
    const r = rng();
    if (difficulty === 2) return r < 0.6 ? giveItem(rng, seed, difficulty) : afterItem(rng, seed, difficulty);
    return r < 0.5 ? threeItem(rng, seed, difficulty) : r < 0.75 ? afterItem(rng, seed, difficulty) : giveItem(rng, seed, difficulty);
}

// ── Heads and legs ──

/** [template, fewer legs, more legs]; the template asks for the many-legged kind or the other. */
const FARMS = [
    { few: 2, many: 4, askMany: 'yardMany', askFew: 'yardFew' },
    { few: 6, many: 8, askMany: 'bugsMany', askFew: 'bugsFew' },
] as const;

export function legsItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const farm = difficulty === 3 && rng() < 0.5 ? FARMS[1] : FARMS[0];
    const heads = intBetween(rng, difficulty === 1 ? 4 : 5, difficulty === 1 ? 6 : farm.few === 6 ? 10 : 12);
    // both kinds at least 2: the explanation's sum needs a "+", and "1 חיפושיות" is not Hebrew
    const many = intBetween(rng, 2, heads - 2);
    const few = heads - many;
    const legs = few * farm.few + many * farm.many;
    const askMany = difficulty === 1 || rng() < 0.5;
    const answer = askMany ? many : few;
    const extra = farm.many - farm.few;
    const base = heads * farm.few;
    const fewName = farm.few === 2 ? 'תרנגולות' : 'חיפושיות';
    const manyName = farm.few === 2 ? 'כבשים' : 'עכבישים';
    return numericItem(rng, seed, difficulty, {
        kind: 'math-legs', skill: 'heads-legs',
        stem: stem(fillPair(reasonPair('legs', askMany ? farm.askMany : farm.askFew), { h: heads, l: legs })),
        answer,
        slips: [
            askMany ? few : many, // answered the other kind
            legs - base, // the extra legs, not divided by the extra per animal
            Math.floor(legs / farm.many), // as if every animal had the many legs
            answer + 1, answer - 1,
        ],
        explanation: `אילו כל ${heads} החיות היו ${fewName}, היו ${farm.few} כפול ${heads}, כלומר ${base} רגליים. `
            + `יש ${legs}, אז חסרות ${ltr(`${legs} − ${base} = ${legs - base}`)} רגליים. `
            + `לכל אחד מה${manyName} יש עוד ${extra} רגליים: ${ltr(`${Array(many).fill(extra).join(' + ')} = ${legs - base}`)}, אז יש ${many} ${manyName}`
            + `${askMany ? '' : `, ו־${ltr(`${heads} − ${many} = ${few}`)} ${fewName}`}.`,
    });
}
