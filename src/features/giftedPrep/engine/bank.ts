import readingJson from '../content/he/reading.json';
import languageJson from '../content/he/language.json';
import type { Difficulty, PrepItem, SkillTag } from '../types';
import { BagDeck } from './bagDeck';
import { shuffleOptions, type Rng } from './prng';

/**
 * Curated Hebrew banks (ADR 2026-11-gifted-prep-stage-a §8). Drafts live in content-drafts/ (never
 * bundled); scripts/prep-content-promote.mjs copies only items Ram approved into content/he/, and
 * __tests__/bank.test.ts fails the build if anything here is not `reviewed`.
 */

export interface BankQuestion {
    readonly id: string;
    readonly stem: string;
    readonly options: readonly string[];
    readonly answerIndex: number;
    readonly explanation: string;
    readonly skill: string;
}

export interface BankPassage {
    readonly id: string;
    readonly title: string;
    readonly text: string;
    readonly length: 'short' | 'long';
    readonly difficulty: number;
    readonly reviewStatus: string;
    readonly source: string;
    readonly questions: readonly BankQuestion[];
}

export interface BankLanguageItem extends BankQuestion {
    readonly kind: 'word-meaning' | 'sentence-completion';
    readonly difficulty: number;
    readonly reviewStatus: string;
    readonly source: string;
}

export const READING_PASSAGES = readingJson.passages as readonly BankPassage[];
export const LANGUAGE_ITEMS = languageJson.items as readonly BankLanguageItem[];

const asDifficulty = (n: number): Difficulty => (n <= 1 ? 1 : n >= 3 ? 3 : 2);

function toItem(rng: Rng, q: BankQuestion, base: Omit<PrepItem, 'options' | 'answerIndex' | 'id' | 'explanation' | 'skill'>): PrepItem {
    const { options, answerIndex } = shuffleOptions(rng, q.options, q.answerIndex);
    return { ...base, id: q.id, options, answerIndex, explanation: q.explanation, skill: q.skill as SkillTag };
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
        const passage = { id: p.id, title: p.title, text: p.text };
        for (const q of p.questions) {
            out.push(toItem(rng, q, {
                kind: 'reading', section: 'reading', difficulty: asDifficulty(p.difficulty),
                stem: { text: q.stem, passage }, source: 'bank',
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
        stem: { text: it.stem }, source: 'bank',
    }));
}
