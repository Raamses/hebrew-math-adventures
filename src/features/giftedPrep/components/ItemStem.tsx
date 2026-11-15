import { BookOpen } from 'lucide-react';
import type { PrepStem } from '../types';

interface ItemStemProps {
    readonly stem: PrepStem;
}

/** Passage (if any), question text and an LTR-isolated equation (vault/rules/rtl-hebrew.md). */
export function ItemStem({ stem }: ItemStemProps) {
    return (
        <div className="space-y-3">
            {stem.passage && (
                <article className="rounded-2xl bg-amber-50 border border-amber-200 p-4" data-testid="prep-passage">
                    <h2 className="flex items-center gap-2 font-bold text-amber-900 mb-2">
                        <BookOpen size={18} aria-hidden="true" /> {stem.passage.title}
                    </h2>
                    <p className="text-lg leading-relaxed text-slate-800 whitespace-pre-line">{stem.passage.text}</p>
                </article>
            )}
            {stem.text && (
                <p className="text-xl font-bold text-slate-800 leading-snug" data-testid="prep-question">{stem.text}</p>
            )}
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
