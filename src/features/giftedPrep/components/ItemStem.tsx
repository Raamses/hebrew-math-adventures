import { BookOpen } from 'lucide-react';
import type { PrepStem } from '../types';
import { pickText } from '../engine/niqqud';
import { FigureBoardView } from './PrepFigure';

interface ItemStemProps {
    readonly stem: PrepStem;
    /** Prefer the vocalized twins when they exist. */
    readonly niqqud?: boolean;
}

/**
 * Number pyramid as equal-width bricks in centered rows: with equal widths and gaps, every brick sits
 * exactly over the gap between the two bricks it is the sum of. Always LTR (numbers).
 */
export function PyramidView({ rows }: { readonly rows: readonly (readonly string[])[] }) {
    return (
        <div dir="ltr" className="unicode-bidi-isolate rounded-2xl bg-white border border-slate-200 py-4 flex flex-col items-center gap-1.5" data-testid="prep-pyramid">
            {rows.map((row, r) => (
                <div key={r} className="flex justify-center gap-1.5">
                    {row.map((cell, c) => (
                        <div
                            key={c}
                            aria-label={cell === '' ? 'ריק' : cell === '?' ? 'סימן שאלה' : cell}
                            data-testid="prep-pyramid-brick"
                            className={cell === '?'
                                ? 'w-16 h-12 rounded-lg border-2 border-indigo-500 bg-indigo-50 text-indigo-700 flex items-center justify-center font-rubik text-3xl font-black'
                                : 'w-16 h-12 rounded-lg border-2 border-amber-400 bg-amber-50 text-slate-800 flex items-center justify-center font-rubik text-2xl font-bold'}
                        >
                            {cell}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

/** Passage (if any), question text and an LTR-isolated equation (vault/rules/rtl-hebrew.md). */
export function ItemStem({ stem, niqqud = false }: ItemStemProps) {
    const pick = (plain?: string, voc?: string) => pickText(niqqud, plain, voc);
    const passage = stem.passage;
    return (
        <div className="space-y-3">
            {stem.passage && (
                <article className="rounded-2xl bg-amber-50 border border-amber-200 p-4" data-testid="prep-passage">
                    <h2 className="flex items-center gap-2 font-bold text-amber-900 mb-2">
                        <BookOpen size={18} aria-hidden="true" /> {pick(passage?.title, passage?.titleNiqqud)}
                    </h2>
                    <p className="text-lg leading-relaxed text-slate-800 whitespace-pre-line">{pick(passage?.text, passage?.textNiqqud)}</p>
                </article>
            )}
            {stem.text && (
                <p className="text-xl font-bold text-slate-800 leading-snug" data-testid="prep-question">{pick(stem.text, stem.textNiqqud)}</p>
            )}
            {stem.pictureLines && (
                <div className="rounded-2xl bg-white border border-slate-200 py-3 space-y-2" data-testid="prep-picture-lines">
                    {stem.pictureLines.map(line => (
                        <div key={line} dir="ltr" className="unicode-bidi-isolate font-rubik text-3xl font-bold text-center text-slate-800 tracking-wide">
                            {line}
                        </div>
                    ))}
                </div>
            )}
            {stem.pyramid && <PyramidView rows={stem.pyramid} />}
            {stem.figures && <FigureBoardView board={stem.figures} />}
            {stem.equation && (
                <div
                    dir="ltr"
                    className="unicode-bidi-isolate font-rubik text-4xl font-black text-center text-indigo-700 py-2"
                    data-testid="prep-equation"
                >
                    {stem.equation}
                </div>
            )}
        </div>
    );
}
