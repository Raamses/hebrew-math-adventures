import { SKILL_TAGS, type SkillTag } from '../types';

/**
 * Bank item shapes + a load-time validator. JSON imports type every field as `string`, so instead of
 * casting, `parseReadingBank` / `parseLanguageBank` check each item and throw on a content typo
 * (e.g. `"skill": "litteral"`) rather than letting it reach the progress skill map.
 * `*Niqqud` fields are the fully vocalized twins (Dicta-reviewed); stripping their marks gives the plain text.
 */

export interface BankQuestion {
    readonly id: string;
    readonly stem: string;
    readonly options: readonly string[];
    readonly answerIndex: number;
    readonly explanation: string;
    readonly skill: SkillTag;
    readonly stemNiqqud?: string;
    readonly optionsNiqqud?: readonly string[];
    readonly explanationNiqqud?: string;
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
    readonly titleNiqqud?: string;
    readonly textNiqqud?: string;
}

export interface BankLanguageItem extends BankQuestion {
    readonly kind: 'word-meaning' | 'sentence-completion';
    readonly difficulty: number;
    readonly reviewStatus: string;
    readonly source: string;
}

export interface BankAnalogyItem extends BankQuestion {
    readonly kind: 'verbal-analogy';
    readonly difficulty: number;
    readonly reviewStatus: string;
    readonly source: string;
}

type Raw = Record<string, unknown>;

const isSkill = (v: unknown): v is SkillTag => typeof v === 'string' && (SKILL_TAGS as readonly string[]).includes(v);
const str = (o: Raw, k: string, id: string): string => {
    if (typeof o[k] !== 'string') throw new Error(`bank ${id}: "${k}" must be a string`);
    return o[k] as string;
};
const optStr = (o: Raw, k: string): string | undefined => (typeof o[k] === 'string' ? (o[k] as string) : undefined);
const difficultyOf = (o: Raw, id: string): number => {
    if (typeof o.difficulty !== 'number' || !Number.isFinite(o.difficulty)) throw new Error(`bank ${id}: difficulty must be a number`);
    return o.difficulty;
};
const strArr = (o: Raw, k: string, id: string): string[] => {
    const v = o[k];
    if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) throw new Error(`bank ${id}: "${k}" must be string[]`);
    return v as string[];
};

export function parseQuestion(o: Raw): BankQuestion {
    const id = String(o.id);
    if (!isSkill(o.skill)) throw new Error(`bank ${id}: unknown skill "${String(o.skill)}"`);
    const options = strArr(o, 'options', id);
    if (options.length !== 4) throw new Error(`bank ${id}: needs exactly 4 options, has ${options.length}`);
    if (typeof o.answerIndex !== 'number' || !Number.isInteger(o.answerIndex) || o.answerIndex < 0 || o.answerIndex >= options.length) {
        throw new Error(`bank ${id}: answerIndex out of range`);
    }
    const optionsNiqqud = o.optionsNiqqud === undefined ? undefined : strArr(o, 'optionsNiqqud', id);
    if (optionsNiqqud && optionsNiqqud.length !== options.length) throw new Error(`bank ${id}: optionsNiqqud length differs from options`);
    return {
        id, stem: str(o, 'stem', id), options, answerIndex: o.answerIndex,
        explanation: str(o, 'explanation', id), skill: o.skill,
        stemNiqqud: optStr(o, 'stemNiqqud'), explanationNiqqud: optStr(o, 'explanationNiqqud'), optionsNiqqud,
    };
}

export function parseReadingBank(json: { passages: readonly unknown[] }): BankPassage[] {
    return json.passages.map(raw => {
        const o = raw as Raw;
        const id = String(o.id);
        return {
            id, title: str(o, 'title', id), text: str(o, 'text', id),
            length: o.length === 'long' ? 'long' : 'short',
            difficulty: difficultyOf(o, id), reviewStatus: str(o, 'reviewStatus', id), source: str(o, 'source', id),
            titleNiqqud: optStr(o, 'titleNiqqud'), textNiqqud: optStr(o, 'textNiqqud'),
            questions: (o.questions as Raw[]).map(parseQuestion),
        };
    });
}

export function parseLanguageBank(json: { items: readonly unknown[] }): BankLanguageItem[] {
    return json.items.map(raw => {
        const o = raw as Raw;
        const id = String(o.id);
        if (o.kind !== 'word-meaning' && o.kind !== 'sentence-completion') throw new Error(`bank ${id}: unknown kind`);
        return {
            ...parseQuestion(o), kind: o.kind, difficulty: difficultyOf(o, id),
            reviewStatus: str(o, 'reviewStatus', id), source: str(o, 'source', id),
        };
    });
}

export function parseAnalogyBank(json: { items: readonly unknown[] }): BankAnalogyItem[] {
    return json.items.map(raw => {
        const o = raw as Raw;
        const id = String(o.id);
        if (o.kind !== 'verbal-analogy') throw new Error(`bank ${id}: unknown kind`);
        return {
            ...parseQuestion(o), kind: o.kind, difficulty: difficultyOf(o, id),
            reviewStatus: str(o, 'reviewStatus', id), source: str(o, 'source', id),
        };
    });
}
