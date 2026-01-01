import React, { useState } from 'react';
import { Plus, Users, Globe } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { ProfileSetup } from '../ProfileSetup';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../mascot/Mascot';
import { SpeechBubble } from '../mascot/SpeechBubble';

interface ProfileSelectorProps {
    onParentAccess: () => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onParentAccess }) => {
    const { allProfiles, switchProfile } = useProfile();
    const [isCreating, setIsCreating] = useState(false);
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'he' ? 'en' : 'he';
        i18n.changeLanguage(newLang);
    };

    if (isCreating) {
        return (
            <div className="w-full max-w-md mx-auto" dir={i18n.dir()}>
                <button
                    onClick={() => setIsCreating(false)}
                    className="mb-4 text-slate-500 hover:text-slate-700 font-bold flex items-center gap-2"
                >
                    <span>{i18n.dir() === 'rtl' ? '←' : '→'}</span>
                    {t('onboarding.back')}
                </button>
                <ProfileSetup onComplete={() => setIsCreating(false)} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden" dir={i18n.dir()}>

            {/* Greeter Mascot - Only on large screens or if space permits */}
            <div className="hidden lg:block absolute bottom-0 left-10 z-0">
                <div className="relative">
                    <SpeechBubble text={t('onboarding.whoIsPlaying')} isVisible={true} className="mb-4" />
                    <Mascot character="owl" emotion="happy" className="w-64 h-64" />
                </div>
            </div>

            <div className="w-full max-w-2xl bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 z-10">
                {/* Header Section */}
                <div className="mb-8">
                    {/* Mobile Layout: Buttons Top, Title Below */}
                    <div className="md:hidden flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors font-bold"
                                title="Switch Language"
                            >
                                <Globe size={20} />
                                <span className="text-sm">{i18n.language === 'he' ? 'English' : 'עברית'}</span>
                            </button>

                            <button
                                onClick={onParentAccess}
                                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <Users size={20} />
                                <span className="text-sm font-bold">{t('onboarding.parentsAccess')}</span>
                            </button>
                        </div>

                        <h1 className="text-2xl font-bold text-primary text-center whitespace-nowrap">
                            {t('onboarding.whoIsPlaying')}
                        </h1>
                    </div>

                    {/* Desktop Layout: Single Row with Centered Title */}
                    <div className="hidden md:flex justify-between items-center relative">
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors font-bold z-10"
                            title="Switch Language"
                        >
                            <Globe size={20} />
                            <span className="text-sm">{i18n.language === 'he' ? 'English' : 'עברית'}</span>
                        </button>

                        <h1 className="text-3xl font-bold text-primary absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                            {t('onboarding.whoIsPlaying')}
                        </h1>

                        <button
                            onClick={onParentAccess}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                        >
                            <Users size={20} />
                            <span className="text-sm font-bold">{t('onboarding.parentsAccess')}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {allProfiles.map(profile => (
                        <button
                            key={profile.id}
                            onClick={() => switchProfile(profile.id)}
                            className="group relative flex flex-col items-center p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border-2 border-transparent hover:border-blue-200 transition-all active:scale-95"
                        >
                            <div className="w-24 h-24 mb-3 flex items-center justify-center transform group-hover:scale-110 transition-transform overflow-hidden">
                                {profile.mascot ? (
                                    <Mascot
                                        character={profile.mascot}
                                        emotion="idle"
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <span className="text-6xl">{profile.avatar}</span>
                                )}
                            </div>
                            <span className="text-xl font-bold text-slate-700 group-hover:text-blue-600">
                                {profile.name}
                            </span>
                            <span className="text-sm text-slate-400 mt-1">
                                {t('zones.level')} {profile.currentLevel}
                            </span>

                        </button>
                    ))}

                    {/* Add New Profile Button */}
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-green-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-green-300 transition-all active:scale-95 h-full min-h-[160px]"
                    >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-green-500">
                            <Plus size={32} />
                        </div>
                        <span className="text-lg font-bold text-slate-500">{t('onboarding.newPlayer')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
