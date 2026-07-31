import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuest } from '../../context/QuestContext';
import { ARCADE_MODE_LABELS } from '../../lib/arcadeModes';

interface QuestPanelProps {
  onStartChallenge: () => void;
}

export const QuestPanel: React.FC<QuestPanelProps> = ({ onStartChallenge }) => {
  const { t } = useTranslation();
  const { todayChallenge, hasCompletedToday, dailyStreak, stampAlbumProgress } = useQuest();

  const modeInfo = ARCADE_MODE_LABELS[todayChallenge.mode];

  return (
    <motion.div
      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-4 mx-4 my-3 shadow-lg"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header row: title + streak */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{modeInfo.emoji}</span>
          <h2 className="text-lg font-bold">{t('daily.title')}</h2>
        </div>
        {dailyStreak > 0 && (
          <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-sm font-bold">
            <span>🔥</span>
            <span>{dailyStreak}</span>
          </div>
        )}
      </div>

      {/* Challenge description */}
      <p className="text-white/90 text-sm mb-3">
        {t('daily.description')}
      </p>

      {/* Challenge details */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        <span className="bg-white/20 px-2 py-1 rounded-full">
          {modeInfo.name}
        </span>
        <span className="bg-white/20 px-2 py-1 rounded-full">
          🎯 {todayChallenge.target} {t('daily.target')}
        </span>
        {todayChallenge.timeLimit && (
          <span className="bg-white/20 px-2 py-1 rounded-full">
            ⏱️ {todayChallenge.timeLimit}s
          </span>
        )}
        <span className="bg-yellow-400/30 px-2 py-1 rounded-full">
          🪙 {todayChallenge.reward} {t('daily.coins')}
        </span>
      </div>

      {/* Stamp album progress */}
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.div
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              i < stampAlbumProgress
                ? 'bg-yellow-400 text-slate-800'
                : 'bg-white/20 text-white/50'
            }`}
            animate={i < stampAlbumProgress ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            {i < stampAlbumProgress ? '✓' : ''}
          </motion.div>
        ))}
        <span className="text-xs ml-2 text-white/80">
          {stampAlbumProgress}/7
        </span>
      </div>

      {/* Action button */}
      {hasCompletedToday ? (
        <div className="flex items-center justify-center gap-2 bg-green-500/80 py-2.5 rounded-xl text-sm font-bold">
          <span>✅</span>
          <span>{t('daily.completed')}</span>
        </div>
      ) : (
        <button
          onClick={onStartChallenge}
          className="w-full py-3 rounded-xl bg-white text-indigo-600 font-bold text-sm shadow-md hover:bg-yellow-100 transition-colors min-h-[48px] active:scale-95"
        >
          {t('daily.start')}
        </button>
      )}
    </motion.div>
  );
};