import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Heart } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { MascotSelector } from './mascot/MascotSelector';
import { useProfile } from '../context/ProfileContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'themes' | 'mascot';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('themes');
    const { profile, updateMascot } = useProfile();

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
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 w-full max-w-2xl max-h-[90vh] flex flex-col"
                        dir="rtl"
                    >
                        {/* Header & Tabs */}
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">הגדרות</h2>

                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button
                                    onClick={() => setActiveTab('themes')}
                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'themes'
                                            ? 'bg-white shadow text-primary'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Palette size={20} />
                                    <span>ערכות נושא</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('mascot')}
                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'mascot'
                                            ? 'bg-white shadow text-purple-600'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Heart size={20} />
                                    <span>החבר שלי</span>
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
                                        בחר את החבר שילווה אותך במסע:
                                    </p>
                                    <MascotSelector
                                        selectedMascot={profile.mascot || 'owl'}
                                        onSelect={(mascot) => updateMascot(mascot)}
                                    />

                                    <div className="mt-8 p-4 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                                        <p className="text-purple-700 font-bold">
                                            החבר שתבחר יופיע במשחק ויעודד אותך!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xl font-bold rounded-2xl transition-all"
                            >
                                סגור
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
