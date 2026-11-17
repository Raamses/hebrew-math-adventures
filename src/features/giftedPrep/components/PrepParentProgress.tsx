import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types/user';
import { loadPrepProgress, prepStorageKey } from '../engine/storage';
import { usePrepT } from '../hooks/usePrepT';
import { PrepProgressPanel } from './PrepProgressPanel';

interface PrepParentProgressProps {
    readonly profile: UserProfile;
}

function hasStoredProgress(profileId: string): boolean {
    try {
        return localStorage.getItem(prepStorageKey(profileId)) !== null;
    } catch {
        return false;
    }
}

/**
 * G7.2: the parent's progress view for one profile, under the Stage-A toggle in the parent zone.
 * Shown while the section is on, or when the profile has prep data from before it was turned off.
 * Reads the stored progress when opened (the prep context is mounted only under the 'prep' view).
 */
export function PrepParentProgress({ profile }: PrepParentProgressProps) {
    const { t } = usePrepT();
    const [open, setOpen] = useState(false);
    const visible = profile.giftedPrepEnabled === true || hasStoredProgress(profile.id);
    const progress = useMemo(() => (open ? loadPrepProgress(profile.id) : null), [open, profile.id]);

    if (!visible) return null;
    const panelId = `prep-progress-panel-${profile.id}`;

    return (
        <div className="mt-3">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                data-testid={`prep-progress-button-${profile.id}`}
                onClick={() => setOpen(o => !o)}
                className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold text-indigo-700"
            >
                <span>📊 {open ? t($ => $.prep.parent.close) : t($ => $.prep.parent.open)}</span>
                <ChevronDown size={18} aria-hidden className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
            </button>
            {open && progress && (
                <div id={panelId}>
                    <PrepProgressPanel progress={progress} />
                </div>
            )}
        </div>
    );
}
