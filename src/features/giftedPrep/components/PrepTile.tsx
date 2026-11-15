import { Brain, ChevronLeft } from 'lucide-react';
import { usePrepT } from '../hooks/usePrepT';

interface PrepTileProps {
    readonly onOpen: () => void;
}

/** SagaMap entry. Rendered only when the parent turned the section on for this profile. */
export function PrepTile({ onOpen }: PrepTileProps) {
    const { t } = usePrepT();
    return (
        <div className="max-w-4xl mx-auto px-3 mt-3">
            <button
                type="button"
                onClick={onOpen}
                data-testid="prep-tile"
                className="w-full flex items-center gap-3 rounded-2xl bg-gradient-to-l from-teal-500 to-emerald-500 text-white px-4 py-3 shadow-md active:scale-[0.98] transition-transform min-h-[56px] text-start"
            >
                <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Brain size={24} aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block font-bold text-lg leading-tight">{t($ => $.prep.tile.title)}</span>
                    <span className="block text-sm text-white/90">{t($ => $.prep.tile.subtitle)}</span>
                </span>
                <ChevronLeft size={22} className="shrink-0 ltr:rotate-180" aria-hidden="true" />
            </button>
        </div>
    );
}
