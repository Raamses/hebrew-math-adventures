import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Music } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { profile, updateProfile, toggleSoundGarden } = useProfile();
    const { t, i18n } = useTranslation();

    if (!isOpen || !profile) return null;

    const settings = profile.settings || { musicVolume: 1, sfxVolume: 1, isMuted: false, soundGarden: false };

    const handleVolumeChange = (key: 'musicVolume' | 'sfxVolume', value: number) => {
        updateProfile(profile.id, {
            settings: { ...settings, [key]: value },
        });
    };

    const handleMuteToggle = () => {
        updateProfile(profile.id, {
            settings: { ...settings, isMuted: !settings.isMuted },
        });
    };

    const handleSoundGardenToggle = () => {
        toggleSoundGarden();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 w-full max-w-md max-h-[90vh] flex flex-col"
                        dir={i18n.dir()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 relative">
                            <h2 className="text-2xl font-bold text-slate-800 text-center pr-8">
                                {t('settings.audio', 'Audio Settings')}
                            </h2>
                            <button
                                onClick={onClose}
                                className="absolute top-4 end-4 text-slate-400 hover:text-slate-600 p-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
                                aria-label={t('settings.close', 'Close')}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Mute Toggle */}
                            <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
                                <div className="flex items-center gap-3">
                                    {settings.isMuted ? (
                                        <VolumeX size={24} className="text-slate-400" />
                                    ) : (
                                        <Volume2 size={24} className="text-indigo-500" />
                                    )}
                                    <span className="font-bold text-slate-700">
                                        {t('settings.mute', 'Mute All Sounds')}
                                    </span>
                                </div>
                                <button
                                    onClick={handleMuteToggle}
                                    data-testid="mute-toggle"
                                    className={`relative w-14 h-8 rounded-full transition-colors min-h-[48px] ${
                                        settings.isMuted ? 'bg-slate-300' : 'bg-indigo-500'
                                    }`}
                                    aria-label={t('settings.mute', 'Mute All Sounds')}
                                >
                                    <motion.div
                                        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                                        animate={{ left: settings.isMuted ? 4 : 32 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>

                            {/* Sound Garden Toggle */}
                            <div className="flex items-center justify-between bg-gradient-to-l from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                                <div className="flex items-center gap-3">
                                    <Music size={24} className="text-purple-500" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700">
                                            {t('settings.soundGarden', 'Sound Garden')}
                                        </span>
                                        <span className="text-xs text-slate-500 mt-0.5">
                                            {t('settings.soundGardenDesc', 'Musical notes instead of beeps')}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSoundGardenToggle}
                                    className={`relative w-14 h-8 rounded-full transition-colors min-h-[48px] ${
                                        settings.soundGarden ? 'bg-purple-500' : 'bg-slate-300'
                                    }`}
                                    aria-label={t('settings.soundGarden', 'Sound Garden')}
                                >
                                    <motion.div
                                        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                                        animate={{ left: settings.soundGarden ? 32 : 4 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>

                            {/* Music Volume */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="music-volume" className="font-bold text-slate-700 text-sm">
                                        {t('settings.musicVolume', 'Music Volume')}
                                    </label>
                                    <span className="text-slate-500 text-sm font-mono">
                                        {Math.round(settings.musicVolume * 100)}%
                                    </span>
                                </div>
                                <input
                                    id="music-volume"
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={settings.musicVolume}
                                    onChange={(e) => handleVolumeChange('musicVolume', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    disabled={settings.isMuted}
                                />
                            </div>

                            {/* SFX Volume */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="sfx-volume" className="font-bold text-slate-700 text-sm">
                                        {t('settings.sfxVolume', 'SFX Volume')}
                                    </label>
                                    <span className="text-slate-500 text-sm font-mono">
                                        {Math.round(settings.sfxVolume * 100)}%
                                    </span>
                                </div>
                                <input
                                    id="sfx-volume"
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={settings.sfxVolume}
                                    onChange={(e) => handleVolumeChange('sfxVolume', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    disabled={settings.isMuted}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xl font-bold rounded-2xl transition-all min-h-[48px]"
                            >
                                {t('settings.close', 'Close')}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};