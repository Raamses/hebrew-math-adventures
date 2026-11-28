// Promote reviewed gifted-prep items from content-drafts/ into the shipped bank (ADR 2026-11-gifted-prep-stage-a §8).
//
// Usage: node scripts/prep-content-promote.mjs <decisions.json> [<more-decisions.json> ...] [--reviewer Ram]
// The shipped bank is rebuilt from ALL decisions given, so pass every review round's export (round 1 + round 2 ...):
// an id missing from every file is not promoted.
// decisions.json: { "<id>": { "status": "approve" | "edit" | "drop", "note"?: string }, ... } — exported from the
// review page's store. Reading decisions are per passage (rc-NNN), language decisions per item (wm-NNN / sc-NNN),
// verbal-analogy decisions per item (va-NNN; drafts in content-drafts/gifted-prep/he/analogies.json).
// Only "approve" is promoted. "edit" stays in drafts until fixed and approved again; "drop" never ships.
// Passages are shipped whole (up to 7 questions), so a mock reading part can run to 14-16 questions; engine/mock.ts
// keeps each part's planned pace per question, so no manual MOCK_PLAN change is needed when promoting.
// An item already in the shipped bank keeps its reviewedAt / reviewedBy: re-running with every round never rewrites
// an earlier approval date. The carry-over is keyed by id only, so a passage that was edited and approved again keeps
// its first approval date; give the reworked text a new id if the date should move.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Review-only annotations that must never reach the bundle (`genre` only labels passages on the review page). */
const REVIEW_ONLY = ['flag', 'note', 'genre'];
const strip = obj => Object.fromEntries(Object.entries(obj).filter(([k]) => !REVIEW_ONLY.includes(k)));

/** Pure core (tested in src/features/giftedPrep/__tests__/promote.test.ts). */
export function promote({ reading, language, analogies = { items: [] } }, decisions, { reviewer = 'Ram', today, shipped = {} }) {
    const approved = id => decisions[id]?.status === 'approve';
    const earlier = new Map([
        ...(shipped.reading?.passages ?? []), ...(shipped.language?.items ?? []), ...(shipped.analogies?.items ?? []),
    ]
        .filter(x => x.reviewedAt).map(x => [x.id, x]));
    const stamp = x => ({
        ...x, reviewStatus: 'reviewed',
        reviewedBy: earlier.get(x.id)?.reviewedBy ?? reviewer, reviewedAt: earlier.get(x.id)?.reviewedAt ?? today,
    });
    const passages = reading.passages.filter(p => approved(p.id))
        .map(p => stamp(strip({ ...p, questions: p.questions.map(strip) })));
    const items = language.items.filter(i => approved(i.id)).map(i => stamp(strip(i)));
    const analogyItems = analogies.items.filter(i => approved(i.id)).map(i => stamp(strip(i)));
    // Niqqud provenance travels with the bank: the approve gate covers the plain text only.
    const prov = bank => (bank.niqqudProvenance ? { niqqudProvenance: bank.niqqudProvenance } : {});
    return {
        reading: { schemaVersion: 1, ...prov(reading), passages },
        language: { schemaVersion: 1, ...prov(language), items },
        analogies: { schemaVersion: 1, ...prov(analogies), items: analogyItems },
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
        analogies: JSON.parse(readFileSync(`${DRAFTS}/analogies.json`, 'utf8')),
    };
    // First promote of a bank: no shipped file yet, so nothing to carry over.
    const readShipped = f => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {});
    const shipped = {
        reading: readShipped(`${SHIPPED}/reading.json`), language: readShipped(`${SHIPPED}/language.json`),
        analogies: readShipped(`${SHIPPED}/analogies.json`),
    };
    const out = promote(drafts, decisions, { reviewer, today: new Date().toISOString().slice(0, 10), shipped });
    writeFileSync(`${SHIPPED}/reading.json`, JSON.stringify(out.reading, null, 1) + '\n');
    writeFileSync(`${SHIPPED}/language.json`, JSON.stringify(out.language, null, 1) + '\n');
    writeFileSync(`${SHIPPED}/analogies.json`, JSON.stringify(out.analogies, null, 1) + '\n');
    const count = s => Object.values(decisions).filter(d => d.status === s).length;
    const qs = out.reading.passages.reduce((n, p) => n + p.questions.length, 0);
    console.log(`promoted ${out.reading.passages.length} passages (${qs} questions) + ${out.language.items.length} language items`
        + ` + ${out.analogies.items.length} verbal-analogy items`);
    console.log(`decisions: approve ${count('approve')}, edit ${count('edit')}, drop ${count('drop')}, `
        + `pending ${drafts.reading.passages.length + drafts.language.items.length + drafts.analogies.items.length
            - Object.keys(decisions).length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
