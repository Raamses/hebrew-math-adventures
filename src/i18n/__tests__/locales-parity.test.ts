import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
import he from '../locales/he.json';

/**
 * Card 4052cdd8 — i18n parity guard, run by `npm run test` in the session
 * gate (./init.sh — install + lint + tsc + unit, baseline-gated).
 *
 * Ram's ruling: missing Hebrew keys are user-visible — Hebrew-reading parents
 * see English fallback text (or blanks) in the parent zone. This test pins:
 *   1. en and he share the EXACT same key set (no missing, no extra)
 *   2. every value is a non-empty string (a null/number leaf cannot slip in
 *      behind a String() cast)
 *   3. interpolation placeholders AND inline tag sets match per key so a
 *      translated string can never drop a {{var}} or Trans markup the UI
 *      expects
 *
 * When you add a feature with new strings: add BOTH locales in the same PR.
 */

type Json = Record<string, unknown>;

function flatten(obj: Json, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(out, flatten(value as Json, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

function placeholders(s: string): string[] {
  return [...s.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort();
}

function tags(s: string): string[] {
  return [...s.matchAll(/<([a-zA-Z][\w-]*)>/g)].map(m => m[1]).sort();
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

  it('every value is a non-empty string in both locales', () => {
    for (const [locale, flat] of [
      ['en', enFlat],
      ['he', heFlat],
    ] as const) {
      const nonStrings = Object.entries(flat)
        .filter(([, v]) => typeof v !== 'string')
        .map(([k, v]) => `${k}: ${typeof v} (${String(v)})`);
      const empties = Object.entries(flat)
        .filter(([, v]) => typeof v === 'string' && !(v as string).trim())
        .map(([k]) => k);
      expect(nonStrings, `${locale}.json has non-string leaves a String() cast would mask: ${nonStrings.join(' | ')}`).toEqual([]);
      expect(empties, `${locale}.json ships empty/whitespace values: ${empties.join(', ')}`).toEqual([]);
    }
  });

  it('every key keeps the same {{variables}} and <tags> in both locales', () => {
    const mismatches: string[] = [];
    for (const key of Object.keys(enFlat)) {
      if (!(key in heFlat)) continue;
      const a = placeholders(String(enFlat[key]));
      const b = placeholders(String(heFlat[key]));
      if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
        mismatches.push(`${key}: en=[{{${a.join('}} {{')}}}] he=[{{${b.join('}} {{')}}}]`);
      }
      const at = tags(String(enFlat[key]));
      const bt = tags(String(heFlat[key]));
      if (at.length !== bt.length || at.some((v, i) => v !== bt[i])) {
        mismatches.push(`${key}: en tags=[${at.join(',')}] he tags=[${bt.join(',')}]`);
      }
    }
    expect(mismatches, `placeholder/tag drift breaks runtime rendering: ${mismatches.join(' | ')}`).toEqual([]);
  });
});
