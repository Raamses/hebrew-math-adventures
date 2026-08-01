import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { useSound } from '../../hooks/useSound';
import { SettingsMenu } from '../SettingsMenu';

interface PracticeHeaderProps {
    targetLevel: number;
    onPause: () => void;
    onOpenSettings: () => void;
}

export const PracticeHeader: React.FC<PracticeHeaderProps> = ({
    targetLevel,
    onPause,
    onOpenSettings
}) => {
    const { t } = useTranslation();
    const { profile } = useProfile();
    const { isMuted, toggleMute } = useSound();

    if (!profile) return null;

    return (
        <div className="w-full max-w-md flex items-center justify-between gap-2 h-12 z-10 mb-2">
            {/* Streak + Level Badge (left, fixed width) */}
            <div
                className="flex-shrink-0 flex items-center gap-2 bg-white/90 backdrop-blur-sm pl-3 pr-2 py-1.5 rounded-full shadow-sm border border-orange-100 cursor-help transition-transform hover:scale-105"
                title={t('app.streakTooltip')}
            >
                <div className="flex items-center gap-1.5">
                    <Zap size={16} className="text-orange-500 fill-orange-500" />
                    <span className="font-bold text-slate-700 text-sm">{profile.streak || 0}</span>
                </div>
                {/* Subtle level divider + level pill */}
                <div className="w-px h-4 bg-slate-200" />
                <span className="text-xs font-bold text-slate-400">Lv {targetLevel}</span>
            </div>

            {/* Title (center, flex-1, truncates gracefully on narrow screens) */}
            <h1 className="flex-1 text-center text-sm font-bold text-primary truncate drop-shadow-sm sm:text-lg">
                {t('app.title')}
            </h1>

            {/* Settings (right, fixed width) */}
            <div className="flex-shrink-0">
                <SettingsMenu
                    onPause={onPause}
                    onToggleMute={toggleMute}
                    isMuted={isMuted}
                    onOpenSettings={onOpenSettings}
                />
            </div>
        </div>
    );
};
