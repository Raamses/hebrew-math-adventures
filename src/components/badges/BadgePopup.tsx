import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Confetti } from '../Confetti';

interface BadgePopupProps {
  badgeId: string | null;
  emoji: string;
  nameKey: string;
  descriptionKey: string;
  onClose: () => void;
}

export const BadgePopup: React.FC<BadgePopupProps> = ({
  badgeId,
  emoji,
  nameKey,
  descriptionKey,
  onClose,
}) => {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (badgeId) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [badgeId]);

  return (
    <>
      {showConfetti && <Confetti />}
      <AnimatePresence>
        {badgeId && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              data-testid="badge-popup"
              className="bg-white rounded-3xl p-6 m-4 max-w-xs w-full shadow-2xl text-center"
              initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Badge label */}
              <p className="text-sm font-bold text-purple-500 mb-2">
                {t('badges.unlocked')}
              </p>

              {/* Badge emoji */}
              <motion.div
                className="text-7xl mb-3"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: 2 }}
              >
                {emoji}
              </motion.div>

              {/* Badge name */}
              <h2 className="text-xl font-bold text-slate-700 mb-1">
                {t(nameKey)}
              </h2>

              {/* Badge description */}
              <p className="text-sm text-slate-400 mb-5">
                {t(descriptionKey)}
              </p>

              {/* Dismiss button */}
              <button
                data-testid="badge-popup-dismiss"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-purple-500 text-white font-bold text-sm shadow-md hover:bg-purple-600 transition-colors min-h-[48px] active:scale-95"
              >
                {t('badges.awesome')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};