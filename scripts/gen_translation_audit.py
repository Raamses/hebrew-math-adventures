import re

# ITEM 4: regenerate TRANSLATION_AUDIT.md — machine-generated from live locales
path = '/Users/admin/hebrew-math-adventures/src/i18n/TRANSLATION_AUDIT.md'
import json

en = json.load(open('/Users/admin/hebrew-math-adventures/src/i18n/locales/en.json'))
he = json.load(open('/Users/admin/hebrew-math-adventures/src/i18n/locales/he.json'))

def flat(d, p=''):
    out = {}
    for k, v in d.items():
        kk = p + '.' + k if p else k
        if isinstance(v, dict):
            out.update(flat(v, kk))
        else:
            out[kk] = v
    return out

fe, fh = flat(en), flat(he)
missing_he = sorted(set(fe) - set(fh))
missing_en = sorted(set(fh) - set(fe))
empty_he = sorted(k for k, v in fh.items() if not str(v).strip())
empty_en = sorted(k for k, v in fe.items() if not str(v).strip())

ph = re.compile(r'\{\{(\w+)\}\}')
ph_drift = []
for k in fe:
    if k not in fh:
        continue
    a = sorted(ph.findall(str(fe[k])))
    b = sorted(ph.findall(str(fh[k])))
    if a != b:
        ph_drift.append(f'{k}: en={a} he={b}')

clusters = {}
for k in sorted(set(fe) | set(fh)):
    c = '.'.join(k.split('.')[:2])
    clusters.setdefault(c, [0, 0])
    if k in fe: clusters[c][0] += 1
    if k in fh: clusters[c][1] += 1

lines = []
lines.append('# TRANSLATION AUDIT — en ⇔ he (auto-generated)')
lines.append('')
lines.append('**DO NOT EDIT BY HAND** — regenerate: `python3 scripts/gen_translation_audit.py` (or the same inline script card 4052cdd8 item-4 used).')
lines.append(f'**Generated:** 2026-10-07 · en keys: {len(fe)} · he keys: {len(fh)}')
lines.append('')
status = 'CLEAN' if not (missing_he or missing_en or empty_he or empty_en or ph_drift) else 'DRIFT'
lines.append(f'## Status: {status}')
lines.append('')
lines.append('- missing in he: ' + (str(len(missing_he)) if missing_he else '0'))
lines.append('- missing in en: ' + (str(len(missing_en)) if missing_en else '0'))
lines.append('- empty he values: ' + (str(len(empty_he)) if empty_he else '0'))
lines.append('- empty en values: ' + (str(len(empty_en)) if empty_en else '0'))
lines.append('- placeholder drift: ' + (str(len(ph_drift)) if ph_drift else '0'))
lines.append('')
if missing_he:
    lines.append('### Missing in he.json')
    for k in missing_he: lines.append(f'- `{k}`')
    lines.append('')
if missing_en:
    lines.append('### Missing in en.json')
    for k in missing_en: lines.append(f'- `{k}`')
    lines.append('')
if ph_drift:
    lines.append('### Placeholder drift')
    for k in ph_drift: lines.append(f'- {k}')
    lines.append('')
lines.append('### Cluster coverage (top-level.section — en count / he count)')
for c in sorted(clusters):
    e, h = clusters[c]
    mark = '✅' if e == h else '⚠️'
    lines.append(f'- {mark} `{c}` — {e}/{h}')
lines.append('')
lines.append('**History:** prior audit stale since Aug 1 (this is the regeneration); drift that accumulated = the 54 parent-games keys, fixed in PR #219; drift guard = src/i18n/__tests__/locales-parity.test.ts (fails CI).')

open(path, 'w').write('\n'.join(lines) + '\n')
print('AUDIT regenerated:', status, '| clusters:', len(clusters), '| missing:', len(missing_he), '| ph-drift:', len(ph_drift))