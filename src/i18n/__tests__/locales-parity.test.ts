import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
import he from '../locales/he.json';

/**
 * Card 4052cdd8 — i18n parity guard (fails CI on key drift).
 *
 * Ram's ruling: missing Hebrew keys are user-visible — Hebrew-reading parents
 * see English fallback text (or blanks) in the parent zone. This test pins:
 *   1. en and he share the EXACT same key set (no missing, no extra)
 *   2. no empty/whitespace values on either side
 *   3. interpolation placeholders match per key ({{var}} sets equal) so a
 *      translated string can never drop a variable the UI expects
 *
 * When you add a feature with new strings: add BOTH locales in the same PR.
 */

type Json = Record<string, unknown>;

function flatten(obj: Json, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(out, flatten(value as Json, path));
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

function placeholders(s: string): string[] {
  return [...s.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort();
}

const enFlat = flatten(en as Json);
const heFlat = flatten(he as Json);

describe('i18n locale parity (en ⇔ he)', () => {
  it('en and he expose the exact same key set', () => {
    const missingInHe = Object.keys(enFlat).filter(k => !(k in heFlat));
    const missingInEn = Object.keys(heFlat).filter(k => !(k in enFlat));
    expect(missingInHe, `keys missing from he.json — Hebrew parents see English fallback: ${missingInHe.join(', ')}`).toEqual([]);
    expect(missingInEn, `keys missing from en.json: ${missingInEn.join(', ')}`).toEqual([]);
  });

  it('no locale ships empty or whitespace-only values', () => {
    const enEmpty = Object.entries(enFlat).filter(([, v]) => !v.trim());
    const heEmpty = Object.entries(heFlat).filter(([, v]) => !v.trim());
    expect(enEmpty.map(([k]) => k)).toEqual([]);
    expect(heEmpty.map(([k]) => k)).toEqual([]);
  });

  it('every interpolated key keeps the same {{variables}} in both locales', () => {
    const mismatches: string[] = [];
    for (const key of Object.keys(enFlat)) {
      if (!(key in heFlat)) continue;
      const a = placeholders(enFlat[key]);
      const b = placeholders(heFlat[key]);
      if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
        mismatches.push(`${key}: en=[${a}] he=[${b}]`);
      }
    }
    expect(mismatches, `placeholder drift breaks runtime interpolation: ${mismatches.join(' | ')}`).toEqual([]);
  });

  it('RTL-sensitive keys exist: parent zone Hebrew coverage is complete', () => {
    // spot-anchor the clusters that drove card 4052cdd8 — if someone deletes
    // the parent.games.items subtree again, this names it in the failure
    for (const key of [
      'parent.games.items.parentBlitz.title',
      'parent.games.items.parentBlitz.feedback.correct',
      'parent.games.items.equationOfTheDay.instructions',
      'parent.games.items.equationOfTheDay.cellState.correct',
    ]) {
      expect(heFlat[key], `he.json lost ${key}`).toBeTruthy();
      expect(enFlat[key], `en.json lost ${key}`).toBeTruthy();
    }
  });
});