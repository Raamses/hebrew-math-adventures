import readingJson from '../content/he/reading.json';
import languageJson from '../content/he/language.json';
import type { Difficulty, PrepItem } from '../types';
import { BagDeck } from './bagDeck';
import { shuffleOptions, type Rng } from './prng';
import { parseLanguageBank, parseReadingBank, type BankLanguageItem, type BankPassage, type BankQuestion } from './bankSchema';

/**
 * Curated Hebrew banks (ADR 2026-11-gifted-prep-stage-a §8). Drafts live in content-drafts/ (never
 * bundled); scripts/prep-content-promote.mjs copies only items Ram approved into content/he/, and
 * __tests__/bank.test.ts fails if anything shipped is not `reviewed`.
 */
export type { BankLanguageItem, BankPassage, BankQuestion } from './bankSchema';

export const READING_PASSAGES: readonly BankPassage[] = parseReadingBank(readingJson);
export const LANGUAGE_ITEMS: readonly BankLanguageItem[] = parseLanguageBank(languageJson);

const asDifficulty = (n: number): Difficulty => (n <= 1 ? 1 : n >= 3 ? 3 : 2);

type ItemBase = Omit<PrepItem, 'options' | 'answerIndex' | 'id' | 'explanation' | 'skill' | 'optionsNiqqud' | 'explanationNiqqud'>;

function toItem(rng: Rng, q: BankQuestion, base: ItemBase): PrepItem {
    // Shuffle indexes once and apply the same order to the plain and the vocalized options.
    const { options: order, answerIndex } = shuffleOptions(rng, q.options.map((_, i) => String(i)), q.answerIndex);
    const idx = order.map(Number);
    return {
        ...base, id: q.id, answerIndex, skill: q.skill,
        options: idx.map(i => q.options[i]),
        optionsNiqqud: q.optionsNiqqud ? idx.map(i => q.optionsNiqqud![i]) : undefined,
        explanation: q.explanation, explanationNiqqud: q.explanationNiqqud,
    };
}

/** Whole passages (all their questions, in order) until `count` questions are reached. */
export function readingItems(rng: Rng, count: number, seen: ReadonlySet<string>, pool = READING_PASSAGES): PrepItem[] {
    if (pool.length === 0) return [];
    // seenIds holds question ids ("rc-001-q2"); a passage counts as seen when any of its questions was answered
    const seenPassages = new Set([...seen].map(id => id.replace(/-q\d+$/, '')));
    const deck = new BagDeck(pool, rng, seenPassages);
    const out: PrepItem[] = [];
    const used = new Set<string>();
    while (out.length < count && used.size < pool.length) {
        const p = deck.draw();
        if (used.has(p.id)) continue;
        used.add(p.id);
        const passage = { id: p.id, title: p.title, text: p.text, titleNiqqud: p.titleNiqqud, textNiqqud: p.textNiqqud };
        for (const q of p.questions) {
            out.push(toItem(rng, q, {
                kind: 'reading', section: 'reading', difficulty: asDifficulty(p.difficulty),
                stem: { text: q.stem, textNiqqud: q.stemNiqqud, passage }, source: 'bank',
            }));
        }
    }
    return out;
}

export function languageItems(rng: Rng, count: number, seen: ReadonlySet<string>, pool = LANGUAGE_ITEMS): PrepItem[] {
    if (pool.length === 0) return [];
    const deck = new BagDeck(pool, rng, seen);
    return deck.drawMany(Math.min(count, pool.length)).map(it => toItem(rng, it, {
        kind: it.kind, section: 'language', difficulty: asDifficulty(it.difficulty),
        stem: { text: it.stem, textNiqqud: it.stemNiqqud }, source: 'bank',
    }));
}
