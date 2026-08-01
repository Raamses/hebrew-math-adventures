import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BADGES } from '../../data/badges';
import { useProfile } from '../../context/ProfileContext';

interface BadgeCollectionProps {
  open: boolean;
  onClose: () => void;
}

export const BadgeCollection: React.FC<BadgeCollectionProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const unlocked = profile?.unlockedBadges || [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-3xl p-5 m-4 max-w-md w-full shadow-2xl"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-center text-slate-700 mb-1">
              {t('badges.collection')}
            </h2>
            <p className="text-center text-slate-400 text-sm mb-4">
              {t('badges.collectionDesc', { count: unlocked.length, total: BADGES.length })}
            </p>

            <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
              {BADGES.map((badge, idx) => {
                const isUnlocked = unlocked.includes(badge.id);
                const progress = badge.progress
                  ? badge.progress({
                      totalCorrect: 0,
                      totalBubblesPopped: 0,
                      maxCombo: 0,
                      bossesDefeated: 0,
                      perfectSessions: 0,
                      dailyStreak: 0,
                      daysPlayed: 0,
                      totalSessionTime: 0,
                    })
                  : null;

                return (
                  <motion.div
                    key={badge.id}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 text-center ${
                      isUnlocked
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <span
                      className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-40'}`}
                    >
                      {badge.emoji}
                    </span>
                    <span className={`text-xs font-bold ${isUnlocked ? 'text-slate-700' : 'text-slate-400'}`}>
                      {t(badge.nameKey)}
                    </span>
                    {!isUnlocked && (
                      <span className="text-[10px] text-slate-400">
                        {progress ? `${progress.current}/${progress.target}` : t('badges.locked')}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 text-slate-400 hover:text-slate-600 font-bold text-sm min-h-[48px]"
            >
              {t('app.common.close')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};