import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LevelUpBannerProps {
    level: number;
    show: boolean;
}

export const LevelUpBanner: React.FC<LevelUpBannerProps> = ({ level, show }) => {
    const { t } = useTranslation();
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3"
                        initial={{ scale: 0, rotate: -10, y: 50 }}
                        animate={{ scale: 1, rotate: 0, y: 0 }}
                        exit={{ scale: 1.5, opacity: 0, y: -50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                        <Star className="w-10 h-10 fill-yellow-300 text-yellow-300" />
                        <div className="flex flex-col">
                            <span className="text-3xl font-black tracking-wide">
                                {t('game.levelUp', { level })}
                            </span>
                            <span className="text-sm font-medium opacity-90">
                                {t('game.levelUpCongrats')}
                            </span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};