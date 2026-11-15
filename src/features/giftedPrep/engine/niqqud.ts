/**
 * Niqqud helpers. Vowel points and cantillation marks count as niqqud; letter-level punctuation does not:
 * maqaf U+05BE, paseq U+05C0, sof pasuq U+05C3 and nun hafukha U+05C6 stay part of the plain text.
 */
const MARK_CLASS = '\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7';

export const NIQQUD_RE = new RegExp(`[${MARK_CLASS}]`);
const NIQQUD_ALL = new RegExp(`[${MARK_CLASS}]`, 'g');

export const stripNiqqud = (s: string): string => s.replace(NIQQUD_ALL, '');
export const hasNiqqud = (s: string): boolean => NIQQUD_RE.test(s);

/** The text a child sees: the vocalized twin when niqqud is on and a twin exists, else the plain text. */
export function pickText<T extends string | undefined>(niqqud: boolean, plain: T, vocalized?: string): T | string {
    return niqqud && vocalized ? vocalized : plain;
}

/** Same rule for the option list: use the vocalized options only when there is one per plain option. */
export function pickOptions(niqqud: boolean, plain: readonly string[], vocalized?: readonly string[]): readonly string[] {
    return niqqud && vocalized && vocalized.length === plain.length ? vocalized : plain;
}
