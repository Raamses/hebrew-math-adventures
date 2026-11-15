import { cn } from '@/lib/utils';

export const OPTION_LABELS = ['א', 'ב', 'ג', 'ד'] as const;

interface OptionListProps {
    readonly options: readonly string[];
    /** Index the child chose, or undefined while unanswered. */
    readonly chosen?: number | null;
    /** Show right/wrong colours (learning mode). In mock mode only the chosen option is marked. */
    readonly reveal: boolean;
    readonly answerIndex: number;
    readonly onChoose: (index: number) => void;
}

const isNumeric = (s: string) => /^\d+$/.test(s);

/** Four answer buttons, RTL-ordered with Hebrew labels א–ד; numbers are LTR-isolated. */
export function OptionList({ options, chosen, reveal, answerIndex, onChoose }: OptionListProps) {
    const locked = chosen !== undefined;
    return (
        <div className="grid grid-cols-1 gap-2 @container" role="radiogroup">
            {options.map((opt, i) => {
                const isChosen = chosen === i;
                const isRight = reveal && locked && i === answerIndex;
                const isWrong = reveal && isChosen && i !== answerIndex;
                return (
                    <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={isChosen}
                        disabled={locked}
                        onClick={() => onChoose(i)}
                        data-testid={`prep-option-${i}`}
                        data-correct={reveal && locked ? String(i === answerIndex) : undefined}
                        className={cn(
                            'flex items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-start min-h-[56px] transition-colors',
                            !locked && 'border-slate-200 active:bg-slate-50',
                            locked && !isRight && !isWrong && !isChosen && 'border-slate-100 opacity-70',
                            isChosen && !reveal && 'border-indigo-500 bg-indigo-50',
                            isRight && 'border-emerald-500 bg-emerald-50',
                            isWrong && 'border-rose-400 bg-rose-50',
                        )}
                    >
                        <span className="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center">
                            {OPTION_LABELS[i]}
                        </span>
                        {isNumeric(opt) ? (
                            <span dir="ltr" className="unicode-bidi-isolate font-rubik text-2xl font-bold text-slate-800">{opt}</span>
                        ) : (
                            <span className="text-lg text-slate-800 leading-snug">{opt}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
