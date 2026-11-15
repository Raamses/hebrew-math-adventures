import { Pause } from 'lucide-react';
import { useState } from 'react';
import { usePrepT } from '../hooks/usePrepT';

interface QuitControlProps {
    readonly onQuit: () => void;
    /** Called when the pause sheet opens/closes, so a mock timer can stop while paused. */
    readonly onPauseChange?: (paused: boolean) => void;
}

/** Game-flow rule: never exit in one tap. Pause opens a sheet; Quit is the second step. */
export function QuitControl({ onQuit, onPauseChange }: QuitControlProps) {
    const { t } = usePrepT();
    const [open, setOpen] = useState(false);
    const set = (v: boolean) => { setOpen(v); onPauseChange?.(v); };

    return (
        <>
            <button
                type="button"
                onClick={() => set(true)}
                aria-label={t($ => $.prep.player.pause)}
                data-testid="prep-pause"
                className="w-11 h-11 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center shrink-0"
            >
                <Pause size={20} aria-hidden="true" />
            </button>
            {open && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-sm rounded-3xl bg-white p-5 space-y-4 shadow-xl">
                        <p className="text-lg font-bold text-slate-800 text-center">{t($ => $.prep.player.quitConfirm)}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => set(false)}
                                data-testid="prep-resume"
                                className="rounded-2xl bg-teal-500 text-white font-bold py-3 min-h-[48px]"
                            >
                                {t($ => $.prep.player.resume)}
                            </button>
                            <button
                                type="button"
                                onClick={onQuit}
                                data-testid="prep-quit"
                                className="rounded-2xl bg-slate-100 text-slate-700 font-bold py-3 min-h-[48px]"
                            >
                                {t($ => $.prep.player.quit)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
