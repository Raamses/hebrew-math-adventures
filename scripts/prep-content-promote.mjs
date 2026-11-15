#!/usr/bin/env node
// Promote reviewed gifted-prep items from content-drafts/ into the shipped bank (ADR 2026-11-gifted-prep-stage-a §8).
//
// Usage: node scripts/prep-content-promote.mjs <decisions.json> [--reviewer Ram]
// decisions.json: { "<id>": { "status": "approve" | "edit" | "drop", "note"?: string }, ... } — exported from the
// review page's store. Reading decisions are per passage (rc-NNN), language decisions per item (wm-NNN / sc-NNN).
// Only "approve" is promoted. "edit" stays in drafts until fixed and approved again; "drop" never ships.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , decisionsPath, ...rest] = process.argv;
if (!decisionsPath) {
    console.error('usage: node scripts/prep-content-promote.mjs <decisions.json> [--reviewer Ram]');
    process.exit(2);
}
const reviewer = rest[rest.indexOf('--reviewer') + 1] && rest.includes('--reviewer') ? rest[rest.indexOf('--reviewer') + 1] : 'Ram';
const decisions = JSON.parse(readFileSync(decisionsPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const DRAFTS = 'content-drafts/gifted-prep/he';
const SHIPPED = 'src/features/giftedPrep/content/he';

const strip = ({ flag, ...rest2 }) => rest2; // review-only annotations never ship
const approved = id => decisions[id]?.status === 'approve';
const stamp = x => ({ ...x, reviewStatus: 'reviewed', reviewedBy: reviewer, reviewedAt: today });

const reading = JSON.parse(readFileSync(`${DRAFTS}/reading.json`, 'utf8'));
const language = JSON.parse(readFileSync(`${DRAFTS}/language.json`, 'utf8'));

const passages = reading.passages.filter(p => approved(p.id))
    .map(p => stamp({ ...p, questions: p.questions.map(strip) }));
const items = language.items.filter(i => approved(i.id)).map(i => stamp(strip(i)));

writeFileSync(`${SHIPPED}/reading.json`, JSON.stringify({ schemaVersion: 1, passages }, null, 1) + '\n');
writeFileSync(`${SHIPPED}/language.json`, JSON.stringify({ schemaVersion: 1, items }, null, 1) + '\n');

const count = s => Object.values(decisions).filter(d => d.status === s).length;
console.log(`promoted ${passages.length} passages (${passages.reduce((n, p) => n + p.questions.length, 0)} questions) + ${items.length} language items`);
console.log(`decisions: approve ${count('approve')}, edit ${count('edit')}, drop ${count('drop')}, ` +
    `pending ${reading.passages.length + language.items.length - Object.keys(decisions).length}`);
