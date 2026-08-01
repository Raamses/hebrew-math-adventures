import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import { getPetStage, decayedHappiness, PET_SPECIES_OPTIONS } from '../../lib/pet';
import { PetAvatar } from './PetAvatar';
import { DailyQuestList } from './DailyQuestList';
import { ArrowRight } from 'lucide-react';

interface PetScreenProps {
  onBack: () => void;
}

export const PetScreen: React.FC<PetScreenProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { profile, feedPet, setPetSpecies, renamePet } = useProfile();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  if (!profile || !profile.pet) {
    return (
      <div className="w-full min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-400">{t('pet.noPet', 'אין חיית מחמד')}</p>
      </div>
    );
  }

  const pet = profile.pet;
  const level = profile.capabilities?.estimatedLevel ?? 1;
  const stage = getPetStage(level);
  const todayISO = new Date().toISOString().slice(0, 10);
  const happiness = decayedHappiness(pet, todayISO);
  const alreadyFedToday = pet.lastFedDate === todayISO;
  const canFeed = (profile.gems || 0) >= 2 && !alreadyFedToday;
  const gems = profile.gems || 0;

  // Next stage info
  const nextStageIdx = Math.min(stage.index + 1, 4);
  const nextStageMinLevel = nextStageIdx > stage.index ? [1,2,4,6,8][nextStageIdx] : null;
  const levelsToGrow = nextStageMinLevel !== null ? nextStageMinLevel - level : 0;

  const handleNameSubmit = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length > 0) {
      renamePet(trimmed);
    }
    setEditingName(false);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 overflow-y-auto" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur z-50 shadow-sm border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
          aria-label={t('menu.back', 'חזור')}
        >
          <ArrowRight size={20} className="rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-slate-700">{t('pet.title', 'החיית שלי')}</h1>
        {/* Gems balance */}
        <div className="flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-full">
          <span className="text-sm">💎</span>
          <span className="text-sm font-bold text-purple-700">{gems}</span>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Pet Hero */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col items-center gap-3">
          <PetAvatar pet={pet} level={level} variant="hero" />
          {/* Name */}
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={20}
                className="text-lg font-bold text-center border-b-2 border-blue-400 outline-none bg-transparent"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
              <button
                onClick={handleNameSubmit}
                className="text-sm font-bold text-white bg-blue-500 px-3 py-1 rounded-full"
              >
                {t('common.save', 'שמור')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameInput(pet.name); setEditingName(true); }}
              className="text-xl font-bold text-slate-700 hover:text-blue-500 transition-colors"
            >
              {pet.name} ✏️
            </button>
          )}
          {/* Stage badge */}
          <div className="text-sm text-slate-400">
            {t(`pet.stage.${stage.key}`, stage.key)} · {t('pet.level', 'רמה')} {level}
          </div>
          {/* Levels to grow */}
          {levelsToGrow > 0 && (
            <div className="text-xs text-purple-500 bg-purple-50 px-3 py-1 rounded-full">
              {levelsToGrow} {t('pet.levelsToGrow', 'רמות לגדילה')} 🌱
            </div>
          )}
        </div>

        {/* Species Selector */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-500 mb-3 text-center">{t('pet.chooseSpecies', 'בחר חיה')}</h3>
          <div className="flex justify-center gap-3">
            {PET_SPECIES_OPTIONS.map((opt) => (
              <button
                key={opt.species}
                onClick={() => setPetSpecies(opt.species)}
                className={`text-3xl p-2 rounded-2xl transition-all ${
                  pet.species === opt.species
                    ? 'bg-purple-100 ring-2 ring-purple-400 scale-110'
                    : 'bg-slate-50 hover:bg-slate-100 opacity-60'
                }`}
                aria-label={opt.name}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Happiness Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-500">{t('pet.happiness', 'אושר')}</h3>
            <span className="text-sm font-bold text-pink-500">{happiness}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                happiness >= 80 ? 'bg-green-400' : happiness >= 60 ? 'bg-yellow-400' : 'bg-orange-400'
              }`}
              style={{ width: `${happiness}%` }}
            />
          </div>
          {/* Feed button */}
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => feedPet()}
              disabled={!canFeed}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                canFeed
                  ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white hover:opacity-90'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>🍎</span>
              <span>{t('pet.feed', 'להאכיל')}</span>
              <span className="text-xs opacity-75">(2💎)</span>
            </button>
          </div>
          {alreadyFedToday && (
            <p className="text-center text-xs text-green-500 mt-2">✓ {t('pet.fedToday', 'הואכל היום')}</p>
          )}
        </div>

        {/* Daily Quests */}
        <DailyQuestList />
      </div>
    </div>
  );
};
