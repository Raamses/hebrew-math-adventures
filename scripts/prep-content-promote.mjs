// Promote reviewed gifted-prep items from content-drafts/ into the shipped bank (ADR 2026-11-gifted-prep-stage-a §8).
//
// Usage: node scripts/prep-content-promote.mjs <decisions.json> [<more-decisions.json> ...] [--reviewer Ram]
// The shipped bank is rebuilt from ALL decisions given, so pass every review round's export (round 1 + round 2 ...):
// an id missing from every file is not promoted.
// decisions.json: { "<id>": { "status": "approve" | "edit" | "drop", "note"?: string }, ... } — exported from the
// review page's store. Reading decisions are per passage (rc-NNN), language decisions per item (wm-NNN / sc-NNN).
// Only "approve" is promoted. "edit" stays in drafts until fixed and approved again; "drop" never ships.
// Round 2 adds passages with 6-7 questions; readingItems() keeps passages whole, so once they ship the mock's
// reading part (MOCK_PLAN: 10 questions, 12 min) can reach ~13-14 questions. Check MOCK_PLAN seconds when promoting.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Review-only annotations that must never reach the bundle (`genre` only labels passages on the review page). */
const REVIEW_ONLY = ['flag', 'note', 'genre'];
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

/** CLI args -> decisions file paths (in order) and reviewer; `--reviewer X` may sit anywhere. Tested. */
export function parseArgs(args) {
    const ri = args.indexOf('--reviewer');
    const reviewer = ri >= 0 && args[ri + 1] ? args[ri + 1] : 'Ram';
    const paths = args.filter((_, i) => ri < 0 || (i !== ri && i !== ri + 1));
    return { paths, reviewer };
}

/** One decisions map from every review round; a later round wins for an id decided twice. Tested. */
export const mergeDecisions = rounds => Object.assign({}, ...rounds);

function main() {
    const { paths, reviewer } = parseArgs(process.argv.slice(2));
    if (paths.length === 0) {
        console.error('usage: node scripts/prep-content-promote.mjs <decisions.json> [<more-decisions.json> ...] [--reviewer Ram]');
        process.exit(2);
    }
    const decisions = mergeDecisions(paths.map(p => JSON.parse(readFileSync(p, 'utf8'))));
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
