import React from 'react';
import { motion } from 'framer-motion';
import { getXPForNextLevel } from '../types/user';
import { useTranslation } from 'react-i18next';

interface ProgressBarProps {
    xp: number;
    level: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ xp, level }) => {
    const { t } = useTranslation();
    const xpForNextLevel = getXPForNextLevel(level);
    const progress = Math.min(100, (xp / xpForNextLevel) * 100);

    return (
        <div className="w-full max-w-md mb-6 px-2">
            <div className="flex justify-between text-slate-600 font-bold mb-1 text-sm">
                <span>{t('zones.level')} {level}</span>
                <span>{t('zones.level')} {level + 1}</span>
            </div>
            <div className="h-6 bg-white rounded-full shadow-inner overflow-hidden border border-slate-200 relative">
                <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-600/50">
                    {xp} / {xpForNextLevel} XP
                </div>
            </div>
        </div>
    );
};
