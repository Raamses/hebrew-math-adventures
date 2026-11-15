import { ArrowRight, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrepSection } from '../types';
import { SECTION_EMOJI, SECTION_ORDER, getSectionBuilder } from '../engine/sections';
import { usePrepT } from '../hooks/usePrepT';
import { usePrepProgress } from '../context/PrepProgressContext';

interface PrepHubProps {
    readonly onBack: () => void;
    readonly onLearn: (section: PrepSection) => void;
    readonly onMock: () => void;
}

export function PrepHub({ onBack, onLearn, onMock }: PrepHubProps) {
    const { t } = usePrepT();
    const { niqqud, setNiqqud } = usePrepProgress();
    // The practice test lands in its own PR (#285); until then the button stays disabled, so no route is missing
    const mockReady = false;

    return (
        <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
            <header className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    data-testid="prep-back"
                    aria-label={t($ => $.prep.hub.back)}
                    className="w-11 h-11 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center shrink-0"
                >
                    <ArrowRight size={22} className="ltr:rotate-180" aria-hidden="true" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-2xl font-black text-slate-800">{t($ => $.prep.hub.title)}</h1>
                    <p className="text-slate-500">{t($ => $.prep.hub.subtitle)}</p>
                </div>
            </header>

            <div className="grid gap-3">
                {SECTION_ORDER.map(section => {
                    const ready = getSectionBuilder(section) !== undefined;
                    return (
                        <button
                            key={section}
                            type="button"
                            disabled={!ready}
                            onClick={() => onLearn(section)}
                            data-testid={`prep-learn-${section}`}
                            className={cn(
                                'flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-4 shadow-sm text-start min-h-[64px]',
                                ready ? 'active:scale-[0.98] transition-transform' : 'opacity-60',
                            )}
                        >
                            <span className="text-3xl" aria-hidden="true">{SECTION_EMOJI[section]}</span>
                            <span className="flex-1 font-bold text-lg text-slate-700">{t($ => $.prep.sections[section])}</span>
                            <span className={cn('text-sm font-bold rounded-full px-3 py-1', ready ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500')}>
                                {ready ? t($ => $.prep.hub.learn) : t($ => $.prep.hub.comingSoon)}
                            </span>
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                disabled={!mockReady}
                onClick={onMock}
                data-testid="prep-mock"
                className={cn(
                    'w-full flex items-center gap-3 rounded-2xl bg-indigo-600 text-white px-4 py-4 shadow-md text-start min-h-[64px]',
                    mockReady ? 'active:scale-[0.98] transition-transform' : 'opacity-50',
                )}
            >
                <Timer size={28} aria-hidden="true" />
                <span className="flex-1">
                    <span className="block font-bold text-lg">{t($ => $.prep.hub.mock)}</span>
                    <span className="block text-sm text-white/85">{mockReady ? t($ => $.prep.hub.mockHint) : t($ => $.prep.hub.comingSoon)}</span>
                </span>
            </button>

            <button
                type="button"
                role="switch"
                aria-checked={niqqud}
                onClick={() => setNiqqud(!niqqud)}
                data-testid="prep-niqqud-toggle"
                className="mx-auto flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-slate-700 min-h-[44px]"
            >
                <span className={cn('w-3 h-3 rounded-full', niqqud ? 'bg-emerald-500' : 'bg-slate-300')} aria-hidden="true" />
                {niqqud ? t($ => $.prep.hub.niqqudOn) : t($ => $.prep.hub.niqqudOff)}
            </button>
            <p className="text-center text-xs text-slate-400">{t($ => $.prep.hub.hebrewOnly)}</p>
        </div>
    );
}
