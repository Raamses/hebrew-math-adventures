import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface SessionProgressBarProps {
    current: number;
    total: number;
}

export const SessionProgressBar: React.FC<SessionProgressBarProps> = ({ current, total }) => {
    const { t } = useTranslation();
    const progress = Math.min(current / total, 1) * 100;

    return (
        <div className="w-full max-w-md mb-6 px-4">
            <div className="flex justify-between text-sm font-bold text-slate-500 mb-1">
                <span>{t('game.questionCount', { current: Math.min(current + 1, total), total })}</span>
                <span>{t('game.progress')}</span>
            </div>
            <div className="h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <motion.div
                    className="h-full bg-gradient-to-r from-primary to-orange-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
        </div>
    );
};
