import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';
import { useSound } from '../../hooks/useSound';
import { SettingsMenu } from '../SettingsMenu';


interface PracticeHeaderProps {
    combo: number;
    onPause: () => void;
    onOpenSettings: () => void;
}

export const PracticeHeader: React.FC<PracticeHeaderProps> = ({
    combo,
    onPause,
    onOpenSettings
}) => {
    const { t } = useTranslation();
    const { profile } = useProfile();
    const { isMuted, toggleMute } = useSound();

    if (!profile) return null;

    return (
        <div className="w-full max-w-md flex flex-col items-center gap-2 z-10 mb-1">
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

            {/* Combo Badge (Replaces Zone Badge) */}
            <div className="h-8 flex items-center justify-center min-w-[120px]">
                <AnimatePresence mode="popLayout">
                    {combo > 1 && (
                        <motion.div
                            key="combo-badge"
                            initial={{ scale: 0, y: -10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black px-4 py-1 rounded-full shadow-md text-sm border-2 border-white/50 flex items-center gap-2"
                        >
                            <span className="drop-shadow-sm">{combo}x {t('combo')}!</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
