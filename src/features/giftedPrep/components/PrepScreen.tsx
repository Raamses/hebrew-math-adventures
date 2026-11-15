'use client';
import { useEffect, useState } from 'react';
import { useProfile } from '@/context/ProfileContext';
import type { PrepSection } from '../types';
import { PrepProgressProvider } from '../context/PrepProgressContext';
import { usePrepAnalytics } from '../hooks/usePrepAnalytics';
import { PrepHub } from './PrepHub';

type Route = { readonly name: 'hub' } | { readonly name: 'learn'; readonly section: PrepSection } | { readonly name: 'mock' };

interface PrepScreenProps {
    readonly onExit: () => void;
}

/**
 * Lazy entry for the 'prep' view (App.tsx). The section is Hebrew-only like the test, so it
 * always renders RTL; UI chrome still follows the app language through i18n.
 */
export default function PrepScreen({ onExit }: PrepScreenProps) {
    const { profile } = useProfile();
    const { open } = usePrepAnalytics();
    const [route, setRoute] = useState<Route>({ name: 'hub' });

    useEffect(() => { open(); }, [open]);

    if (!profile) return null;

    return (
        <PrepProgressProvider profileId={profile.id}>
            <div dir="rtl" lang="he" className="min-h-screen bg-gradient-to-b from-teal-50 to-slate-100 pb-[env(safe-area-inset-bottom)]" data-testid="prep-screen">
                {route.name === 'hub' && (
                    <PrepHub
                        onBack={onExit}
                        onLearn={section => setRoute({ name: 'learn', section })}
                        onMock={() => setRoute({ name: 'mock' })}
                    />
                )}
            </div>
        </PrepProgressProvider>
    );
}
