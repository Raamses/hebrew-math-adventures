import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { useSound } from '../../hooks/useSound';
import { SettingsMenu } from '../SettingsMenu';
import { getZoneForLevel } from '../../lib/worldConfig';

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
        <div className="w-full max-w-md flex flex-col items-center gap-2 z-10 mb-2">
            <div className="w-full flex items-center justify-between relative h-12">
                {/* Streak Badge */}
                <div
                    className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-orange-100 z-10 cursor-help transition-transform hover:scale-105"
                    title={t('app.streakTooltip')}
                >
                    <Zap size={16} className="text-orange-500 fill-orange-500" />
                    <span className="font-bold text-slate-700 text-sm">{profile.streak || 0}</span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-primary absolute left-1/2 -translate-x-1/2 whitespace-nowrap drop-shadow-sm">
                    {t('app.title')}
                </h1>

                {/* Settings */}
                <div className="z-20">
                    <SettingsMenu
                        onPause={onPause}
                        onToggleMute={toggleMute}
                        isMuted={isMuted}
                        onOpenSettings={onOpenSettings}
                    />
                </div>
            </div>

            {/* Zone Badge */}
            <div className="bg-emerald-100/80 backdrop-blur-sm px-4 py-1 rounded-full border border-emerald-200 shadow-sm flex items-center gap-2">
                {(() => {
                    const zone = getZoneForLevel(targetLevel);
                    const ZoneIcon = zone?.icon || Zap;
                    return (
                        <>
                            <ZoneIcon size={14} className="text-emerald-700" />
                            <span className="text-xs font-bold text-emerald-800">
                                {t('zones.level')} {targetLevel} • {zone ? t(zone.name) : t('zones.fallback')}
                            </span>
                        </>
                    );
                })()}
            </div>
        </div>
    );
};
