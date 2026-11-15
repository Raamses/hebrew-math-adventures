// Promote reviewed gifted-prep items from content-drafts/ into the shipped bank (ADR 2026-11-gifted-prep-stage-a §8).
//
// Usage: node scripts/prep-content-promote.mjs <decisions.json> [--reviewer Ram]
// decisions.json: { "<id>": { "status": "approve" | "edit" | "drop", "note"?: string }, ... } — exported from the
// review page's store. Reading decisions are per passage (rc-NNN), language decisions per item (wm-NNN / sc-NNN).
// Only "approve" is promoted. "edit" stays in drafts until fixed and approved again; "drop" never ships.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Review-only annotations that must never reach the bundle. */
const REVIEW_ONLY = ['flag', 'note'];
const strip = obj => Object.fromEntries(Object.entries(obj).filter(([k]) => !REVIEW_ONLY.includes(k)));

/** Pure core (tested in src/features/giftedPrep/__tests__/promote.test.ts). */
export function promote({ reading, language }, decisions, { reviewer = 'Ram', today }) {
    const approved = id => decisions[id]?.status === 'approve';
    const stamp = x => ({ ...x, reviewStatus: 'reviewed', reviewedBy: reviewer, reviewedAt: today });
    const passages = reading.passages.filter(p => approved(p.id))
        .map(p => stamp(strip({ ...p, questions: p.questions.map(strip) })));
    const items = language.items.filter(i => approved(i.id)).map(i => stamp(strip(i)));
    // Niqqud provenance travels with the bank: the approve gate covers the plain text only.
    const prov = bank => (bank.niqqudProvenance ? { niqqudProvenance: bank.niqqudProvenance } : {});
    return {
        reading: { schemaVersion: 1, ...prov(reading), passages },
        language: { schemaVersion: 1, ...prov(language), items },
    };
}

function main() {
    const [, , decisionsPath, ...rest] = process.argv;
    if (!decisionsPath) {
        console.error('usage: node scripts/prep-content-promote.mjs <decisions.json> [--reviewer Ram]');
        process.exit(2);
    }
    const ri = rest.indexOf('--reviewer');
    const reviewer = ri >= 0 && rest[ri + 1] ? rest[ri + 1] : 'Ram';
    const decisions = JSON.parse(readFileSync(decisionsPath, 'utf8'));
    const DRAFTS = 'content-drafts/gifted-prep/he';
    const SHIPPED = 'src/features/giftedPrep/content/he';
    const drafts = {
        reading: JSON.parse(readFileSync(`${DRAFTS}/reading.json`, 'utf8')),
        language: JSON.parse(readFileSync(`${DRAFTS}/language.json`, 'utf8')),
    };
    const out = promote(drafts, decisions, { reviewer, today: new Date().toISOString().slice(0, 10) });
    writeFileSync(`${SHIPPED}/reading.json`, JSON.stringify(out.reading, null, 1) + '\n');
    writeFileSync(`${SHIPPED}/language.json`, JSON.stringify(out.language, null, 1) + '\n');
    const count = s => Object.values(decisions).filter(d => d.status === s).length;
    const qs = out.reading.passages.reduce((n, p) => n + p.questions.length, 0);
    console.log(`promoted ${out.reading.passages.length} passages (${qs} questions) + ${out.language.items.length} language items`);
    console.log(`decisions: approve ${count('approve')}, edit ${count('edit')}, drop ${count('drop')}, `
        + `pending ${drafts.reading.passages.length + drafts.language.items.length - Object.keys(decisions).length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
