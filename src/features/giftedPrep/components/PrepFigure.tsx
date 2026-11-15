import type { Figure, FigureBoard, FigColor, Shape } from '../engine/figures';
import { label } from '../engine/figures';
import { cn } from '@/lib/utils';

/** Colour-blind-friendlier saturated fills; shape always differs too, so colour is never the only cue. */
const FILL: Readonly<Record<FigColor, string>> = {
    red: '#e11d48', blue: '#2563eb', green: '#16a34a', yellow: '#eab308', purple: '#9333ea',
};

/** 0–40 viewBox paths; all point up at rotation 0. */
const PATH: Readonly<Record<Exclude<Shape, 'circle'>, string>> = {
    square: 'M6 6h28v28H6z',
    triangle: 'M20 4L36 34H4z',
    star: 'M20 3l4.9 10.6 11.6 1.3-8.6 7.8 2.4 11.4L20 28.3 9.7 34.1l2.4-11.4-8.6-7.8 11.6-1.3z',
    heart: 'M20 35S4 25 4 14a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 11-16 21-16 21z',
    arrow: 'M20 3L34 18H25V37H15V18H6z',
};

/** Size steps far enough apart to tell small from medium at option size. */
const SCALE = { 1: 0.48, 2: 0.74, 3: 1 } as const;

function Glyph({ fig, px }: { readonly fig: Figure; readonly px: number }) {
    const s = SCALE[fig.size];
    const t = `rotate(${fig.rot} 20 20) translate(20 20) scale(${s}) translate(-20 -20)`;
    return (
        <svg viewBox="0 0 40 40" width={px} height={px} aria-hidden="true" className="shrink-0">
            <g transform={t} fill={FILL[fig.color]} stroke="#1e293b" strokeWidth={1.2} strokeLinejoin="round">
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

/** A series row or a 3×3 grid; RTL order, so a series reads right to left like the booklet. */
export function FigureBoardView({ board }: { readonly board: FigureBoard }) {
    return (
        <div
            data-testid="prep-figures"
            className={cn('rounded-2xl bg-white border border-slate-200 p-3 gap-2',
                board.layout === 'grid' ? 'grid grid-cols-3 max-w-[260px] mx-auto' : 'flex flex-wrap justify-center')}
        >
            {board.cells.map((cell, i) => (
                <div key={i} className="min-w-[56px] min-h-[56px] rounded-xl bg-slate-50 flex items-center justify-center">
                    {cell ? <PrepFigure fig={cell} /> : <span className="font-rubik text-3xl font-black text-indigo-600" aria-label="?">?</span>}
                </div>
            ))}
        </div>
    );
}
