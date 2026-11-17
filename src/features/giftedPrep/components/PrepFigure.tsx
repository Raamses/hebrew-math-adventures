import { ArrowLeft } from 'lucide-react';
import type { Figure, FigureBoard, FigColor } from '../engine/figures';
import { label } from '../engine/figures';
import { figureTransform, PATH } from '../engine/figurePaths';
import { cn } from '@/lib/utils';

/** Colour-blind-friendlier saturated fills; shape always differs too, so colour is never the only cue. */
const FILL: Readonly<Record<FigColor, string>> = {
    red: '#e11d48', blue: '#2563eb', green: '#16a34a', yellow: '#eab308', purple: '#9333ea',
};

function Glyph({ fig, px }: { readonly fig: Figure; readonly px: number }) {
    return (
        <svg viewBox="0 0 40 40" width={px} height={px} aria-hidden="true" className="shrink-0">
            <g transform={figureTransform(fig)} fill={FILL[fig.color]} stroke="#1e293b" strokeWidth={1.2} strokeLinejoin="round">
                {fig.shape === 'circle' ? <circle cx={20} cy={20} r={16} /> : <path d={PATH[fig.shape]} />}
            </g>
        </svg>
    );
}

/** One figure (all `count` copies), named for screen readers by its Hebrew label. */
export function PrepFigure({ fig, px = 40, className }: { readonly fig: Figure; readonly px?: number; readonly className?: string }) {
    const copies = Array.from({ length: fig.count }, (_, i) => i);
    return (
        <span role="img" aria-label={label(fig)} className={cn('inline-flex flex-wrap items-center justify-center gap-0.5', className)}>
            {copies.map(i => <Glyph key={i} fig={fig} px={fig.count > 2 ? Math.round(px * 0.6) : px} />)}
        </span>
    );
}

const Cell = ({ fig }: { readonly fig: Figure | null }) => (
    <div className="min-w-[56px] min-h-[56px] rounded-xl bg-slate-50 flex items-center justify-center">
        {fig ? <PrepFigure fig={fig} /> : <span className="font-rubik text-3xl font-black text-indigo-600" aria-label="?">?</span>}
    </div>
);

/**
 * "A is to B as C is to ?": two pairs, each read right to left with an arrow from the first figure to the
 * second. dir="rtl" is pinned here (not inherited), so A always sits rightmost and "?" leftmost, and the
 * arrow (not a bidi-mirrored glyph) points the way the child reads.
 */
function AnalogyRow({ cells }: { readonly cells: readonly (Figure | null)[] }) {
    const pair = (from: Figure | null, to: Figure | null, n: number) => (
        <div data-testid={`prep-analogy-pair-${n}`} className="flex items-center gap-1 rounded-2xl border border-slate-200 p-1.5">
            <Cell fig={from} />
            <ArrowLeft size={22} aria-hidden="true" className="shrink-0 text-indigo-500" />
            <Cell fig={to} />
        </div>
    );
    return (
        <div dir="rtl" data-testid="prep-figures" data-layout="analogy"
            className="rounded-2xl bg-white border border-slate-200 p-3 flex flex-wrap items-center justify-center gap-3">
            {pair(cells[0], cells[1], 1)}
            <span className="sr-only">כמו</span>
            {pair(cells[2], cells[3], 2)}
        </div>
    );
}

/** A series row, a 3×3 grid or an analogy; RTL order, so a series reads right to left like the booklet. */
export function FigureBoardView({ board }: { readonly board: FigureBoard }) {
    if (board.layout === 'analogy') return <AnalogyRow cells={board.cells} />;
    return (
        <div
            data-testid="prep-figures"
            className={cn('rounded-2xl bg-white border border-slate-200 p-3 gap-2',
                board.layout === 'grid' ? 'grid grid-cols-3 max-w-[260px] mx-auto' : 'flex flex-wrap justify-center')}
        >
            {board.cells.map((cell, i) => <Cell key={i} fig={cell} />)}
        </div>
    );
}
