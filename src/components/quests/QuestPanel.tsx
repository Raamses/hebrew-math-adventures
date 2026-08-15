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
  const { todayChallenge, hasCompletedToday, dailyStreak, stampAlbumProgress, dailyChallengeCorrect } = useQuest();

  const modeInfo = ARCADE_MODE_LABELS[todayChallenge.mode] || {
    name: todayChallenge.mode,
    emoji: '🎮',
    desc: '',
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white rounded-3xl p-3.5 mx-3 my-3 shadow-xl border border-white/20 relative overflow-hidden"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Decorative background ambient glows */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header row: Icon + Title + Streak */}
      <div className="flex items-center justify-between mb-2.5 gap-2 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.div
            className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner border border-white/30 shrink-0"
            animate={{ scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {modeInfo.emoji}
          </motion.div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {t('daily.title')}
              </h2>
              <span className="text-[11px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/20">
                {modeInfo.name}
              </span>
            </div>
            <p className="text-xs text-white/90 truncate font-medium mt-0.5">
              {t('daily.description')}
            </p>
          </div>
        </div>

        {dailyStreak > 0 && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 px-2.5 py-1 rounded-full text-xs font-black shadow-md border border-amber-300/60 shrink-0"
            title={`${dailyStreak} ${t('daily.streak', 'רצף ימים')}`}
          >
            <span className="text-sm select-none">🔥</span>
            <span>{dailyStreak}</span>
          </motion.div>
        )}
      </div>

      {/* Challenge parameter tags (wrapping smoothly without overflow) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-xs relative z-10">
        {/* Target */}
        <span className="flex items-center gap-1 bg-white/15 backdrop-blur-xs px-2.5 py-1 rounded-xl font-bold border border-white/15 shadow-xs">
          <span>🎯</span>
          <span>{todayChallenge.target} {t('daily.target')}</span>
        </span>

        {/* Time Limit (if exists) */}
        {todayChallenge.timeLimit && (
          <span className="flex items-center gap-1 bg-white/15 backdrop-blur-xs px-2.5 py-1 rounded-xl font-bold border border-white/15 shadow-xs">
            <span>⏱️</span>
            <span>{todayChallenge.timeLimit}s</span>
          </span>
        )}

        {/* Reward */}
        <span className="flex items-center gap-1 bg-amber-400/25 backdrop-blur-xs px-2.5 py-1 rounded-xl font-black text-amber-200 border border-amber-300/35 shadow-xs">
          <span>🪙</span>
          <span>+{todayChallenge.reward} {t('daily.coins')}</span>
        </span>
      </div>

      {/* Accumulated Progress bar (during active challenge session) */}
      {!hasCompletedToday && dailyChallengeCorrect > 0 && (
        <div className="mb-3 bg-black/20 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-white/90 flex items-center gap-1">
              <span>⚡</span> {t('daily.target', 'התקדמות')}
            </span>
            <span className="text-amber-300 font-black">
              {dailyChallengeCorrect} / {todayChallenge.target}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden p-0.5">
            <motion.div
              className="bg-gradient-to-r from-amber-300 to-yellow-400 h-full rounded-full shadow-xs"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (dailyChallengeCorrect / todayChallenge.target) * 100)}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* 7-Day Stamp Album Section */}
      <div className="mb-3.5 bg-black/15 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10 relative z-10">
        <div className="flex items-center justify-between text-xs font-bold text-white/90 mb-2 px-0.5">
          <span className="flex items-center gap-1">
            <span>📅</span>
            <span>{t('app.streak', 'רצף שבועי')}</span>
          </span>
          <span className="text-amber-200 font-black bg-white/15 px-2 py-0.5 rounded-full text-[11px] border border-white/10">
            {stampAlbumProgress}/7
          </span>
        </div>

        <div className="flex items-center justify-between gap-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const isCompleted = i < stampAlbumProgress;
            const isCurrent = !hasCompletedToday && i === stampAlbumProgress;

            return (
              <motion.div
                key={i}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  isCompleted
                    ? 'bg-gradient-to-tr from-amber-300 to-yellow-400 text-amber-950 shadow-md ring-2 ring-yellow-300/40 border border-yellow-200'
                    : isCurrent
                    ? 'bg-white/25 text-white border-2 border-dashed border-amber-300/90'
                    : 'bg-white/10 text-white/40 border border-white/15'
                }`}
                animate={
                  isCompleted
                    ? { scale: [1, 1.15, 1] }
                    : isCurrent
                    ? { scale: [1, 1.08, 1] }
                    : {}
                }
                transition={
                  isCurrent
                    ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.3, delay: i * 0.04 }
                }
              >
                {isCompleted ? '✓' : i + 1}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Action button / Celebration state */}
      <div className="relative z-10">
        {hasCompletedToday ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4 rounded-2xl text-sm font-black shadow-lg shadow-emerald-950/20 border border-emerald-300/30 min-h-[48px]"
          >
            <motion.span
              animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="text-lg select-none"
            >
              🎉
            </motion.span>
            <span>{t('daily.completed')}</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">✨</span>
          </motion.div>
        ) : (
          <motion.button
            onClick={onStartChallenge}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-amber-50 text-indigo-700 font-black text-base shadow-lg shadow-indigo-950/30 flex items-center justify-center gap-2 transition-all min-h-[48px] cursor-pointer active:scale-95"
          >
            <span className="text-lg select-none">🚀</span>
            <span>{t('daily.start')}</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};