import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Heart } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { MascotSelector } from './mascot/MascotSelector';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'themes' | 'mascot';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('themes');
    const { profile, updateMascot } = useProfile();
    const { t } = useTranslation();

    if (!isOpen || !profile) return null;

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
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 w-full max-w-2xl max-h-[90vh] flex flex-col"
                    >
                        {/* Header & Tabs */}
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">{t('menu.settings')}</h2>

                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button
                                    onClick={() => setActiveTab('themes')}
                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'themes'
                                        ? 'bg-white shadow text-primary'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Palette size={20} />
                                    <span>{t('settings.themes')}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('mascot')}
                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'mascot'
                                        ? 'bg-white shadow text-purple-600'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Heart size={20} />
                                    <span>{t('settings.mascot')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {activeTab === 'themes' ? (
                                <ThemeSelector />
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-center text-slate-600 mb-6 text-lg">
                                        {t('settings.mascotPrompt')}
                                    </p>
                                    <MascotSelector
                                        selectedMascot={profile.mascotId}
                                        onSelect={(mascot) => updateMascot(mascot)}
                                    />

                                    <div className="mt-8 p-4 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                                        <p className="text-purple-700 font-bold">
                                            {t('settings.mascotNote')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 flex flex-col gap-4">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
                                    alert(t('settings.debugCopied') || 'Debug data copied to clipboard!');
                                }}
                                className="text-slate-400 text-sm hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="underline">Copy Debug Data</span>
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xl font-bold rounded-2xl transition-all"
                            >
                                {t('settings.close')}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
