import more from '../content/he/math-more.json';
import type { PrepStem } from '../types';

/**
 * Hebrew stems for the wider math pool (content/he/math-more.json). Every template is a [plain, vocalized]
 * pair; `{{name}}` placeholders are filled the same way in both, so the niqqud twin always matches.
 */
export type StemKey = keyof typeof more.stems;
export type WordKey = keyof typeof more.wordProblems;
export type Pair = readonly [string, string];

type Vars = Readonly<Record<string, string | number>>;

const fill = (t: string, vars: Vars) => t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    if (!(k in vars)) throw new Error(`math stem: missing {{${k}}}`);
    return String(vars[k]);
});

export function fillPair([plain, voc]: Pair, vars: Vars = {}): Pick<PrepStem, 'text' | 'textNiqqud'> {
    return { text: fill(plain, vars), textNiqqud: fill(voc, vars) };
}

export const stemPair = (key: StemKey): Pair => more.stems[key] as unknown as Pair;
export const wordPair = (key: WordKey): Pair => more.wordProblems[key] as unknown as Pair;
export const SHOP_ITEMS: readonly Pair[] = more.shopItems as unknown as Pair[];

/** For tests: every pair in the file. */
export const ALL_PAIRS: readonly Pair[] = [
    ...Object.values(more.stems), ...Object.values(more.wordProblems), ...more.shopItems,
] as unknown as Pair[];
