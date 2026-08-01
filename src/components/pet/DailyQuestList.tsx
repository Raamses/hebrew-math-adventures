import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuest } from '../../context/QuestContext';

export const DailyQuestList: React.FC = () => {
  const { t } = useTranslation();
  const { todayQuests, questProgress, questClaimed, claimQuest } = useQuest();

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-slate-700 text-center">{t('quest.title', 'משימות יומיות')}</h3>
      {todayQuests.map((q) => {
        const progress = questProgress[q.id] || 0;
        const isComplete = progress >= q.target;
        const isClaimed = questClaimed.includes(q.id);
        const pct = Math.min(100, (progress / q.target) * 100);

        return (
          <div key={q.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{q.icon}</span>
                <div>
                  <div className="font-bold text-sm text-slate-700">{t(q.titleKey, q.titleKey)}</div>
                  <div className="text-xs text-slate-400">{t(q.descKey, q.descKey)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-purple-100 px-2 py-0.5 rounded-full">
                <span className="text-xs">💎</span>
                <span className="text-xs font-bold text-purple-700">{q.gemReward}</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-400' : 'bg-blue-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-slate-500">{progress} / {q.target}</span>
              {isClaimed ? (
                <span className="text-xs font-bold text-green-600">✓ {t('quest.claimed', 'נתבע')}</span>
              ) : isComplete ? (
                <button
                  onClick={() => claimQuest(q.id)}
                  className="text-xs font-bold text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-full transition-colors"
                >
                  {t('quest.claim', 'תבע')} 💎
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};