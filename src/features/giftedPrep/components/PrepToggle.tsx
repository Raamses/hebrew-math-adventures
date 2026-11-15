import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types/user';
import { usePrepT } from '../hooks/usePrepT';
import { usePrepAnalytics } from '../hooks/usePrepAnalytics';

interface PrepToggleProps {
    readonly profile: UserProfile;
    readonly onChange: (id: string, updates: Partial<UserProfile>) => void;
}

/** Per-profile parent switch for the gifted-prep section (off by default). */
export function PrepToggle({ profile, onChange }: PrepToggleProps) {
    const { t } = usePrepT();
    const { toggled } = usePrepAnalytics();
    const enabled = profile.giftedPrepEnabled === true;

    const flip = () => {
        onChange(profile.id, { giftedPrepEnabled: !enabled });
        toggled(!enabled);
    };

    return (
        <div className="flex items-center gap-3 border-t border-slate-100 pt-3 mt-3">
            <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-700 text-sm">🧠 {t($ => $.prep.toggle.label)}</div>
                <div className="text-xs text-slate-400">{t($ => $.prep.toggle.hint)}</div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`${t($ => $.prep.toggle.label)} – ${profile.name}`}
                data-testid={`prep-toggle-${profile.id}`}
                onClick={flip}
                className={cn(
                    'flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors',
                    enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start',
                )}
            >
                <span className="block h-5 w-5 rounded-full bg-white shadow" />
            </button>
        </div>
    );
}
