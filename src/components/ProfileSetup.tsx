import React, { useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { type MascotCharacter } from './mascot/Mascot';
import { MascotSelector } from './mascot/MascotSelector';
import { useTranslation } from 'react-i18next';
import { isValidProfileName } from '../lib/validation';

const AVATARS = ['🦁', '🐯', '🐻', '🐨', '🐼', '🐸', '🦄', '🐲', '🚀', '⭐'];

interface ProfileSetupProps {
    onComplete?: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
    const { createProfile } = useProfile();
    const [name, setName] = useState('');
    const [age, setAge] = useState<number>(6);
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
    const [selectedMascot, setSelectedMascot] = useState<MascotCharacter>('owl');
    const [error, setError] = useState('');
    const { t } = useTranslation();

    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;

        if (!isValidProfileName(trimmedName)) {
            setError(t('parent.edit.errorName') || 'Invalid name. Use only letters, numbers and spaces.');
            return;
        }

        setError('');
        const sanitizedName = trimmedName.slice(0, 30);
        await createProfile(sanitizedName, age, selectedAvatar, selectedMascot);
        if (onComplete) onComplete();
    };

    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-center text-primary mb-8">{t('onboarding.title')}</h1>

            {error && (
                <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Selection */}
                <div>
                    <label className="block text-slate-600 font-bold mb-2 text-lg" id="avatar-label">{t('onboarding.selectAvatar')}</label>
                    <div className="grid grid-cols-5 gap-2" role="group" aria-labelledby="avatar-label">
                        {AVATARS.map(avatar => (
                            <button
                                key={avatar}
                                type="button"
                                onClick={() => setSelectedAvatar(avatar)}
                                aria-label={`Select avatar ${avatar}`}
                                aria-pressed={selectedAvatar === avatar}
                                className={`text-3xl p-2 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary outline-none ${selectedAvatar === avatar
                                    ? 'bg-blue-100 scale-110 ring-2 ring-blue-400'
                                    : 'hover:bg-slate-50'
                                    }`}
                            >
                                <span aria-hidden="true">{avatar}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mascot Selection */}
                <div>
                    <label className="block text-slate-600 font-bold mb-2 text-lg">{t('onboarding.selectMascot')}</label>
                    <MascotSelector selectedMascot={selectedMascot} onSelect={setSelectedMascot} />
                </div>

                <div>
                    <label htmlFor="setup-name" className="block text-slate-600 font-bold mb-2 text-lg">{t('onboarding.nameLabel')}</label>
                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                    <input
                        id="setup-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value.slice(0, 30))}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary text-xl text-start"
                        placeholder={t('onboarding.namePlaceholder')}
                        required
                        maxLength={30}
                    />
                </div>

                <div>
                    <label className="block text-slate-600 font-bold mb-2 text-lg" id="age-label">{t('onboarding.ageLabel')}</label>
                    <div className="flex items-center justify-center gap-4 bg-slate-50 p-4 rounded-xl" role="group" aria-labelledby="age-label">
                        <button
                            type="button"
                            onClick={() => setAge(Math.max(4, age - 1))}
                            aria-label="Decrease age"
                            className="w-10 h-10 rounded-full bg-white shadow text-primary font-bold text-xl hover:bg-orange-50 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            -
                        </button>
                        <span className="text-3xl font-bold text-slate-700 w-12 text-center" aria-live="polite">{age}</span>
                        <button
                            type="button"
                            onClick={() => setAge(Math.min(12, age + 1))}
                            aria-label="Increase age"
                            className="w-10 h-10 rounded-full bg-white shadow text-primary font-bold text-xl hover:bg-orange-50 focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-center text-slate-400 text-sm mt-2">
                        {t('onboarding.ageNote')}
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={!name.trim()}
                    className="w-full py-4 bg-primary hover:bg-orange-600 text-white text-2xl font-bold rounded-xl shadow-lg shadow-orange-500/30 mt-4 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('onboarding.start')}
                </button>
            </form>
        </div>
    );
};
