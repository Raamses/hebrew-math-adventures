import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Home, X, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GameMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestart: () => void;
    onExit: () => void;
    onSettings: () => void;
}

export const GameMenuModal: React.FC<GameMenuModalProps> = ({ isOpen, onClose, onRestart, onExit, onSettings }) => {
    const { t } = useTranslation();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-white rounded-3xl p-8 w-[90%] max-w-[400px] shadow-2xl pointer-events-auto relative">
                            {/* Header/Close */}
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-3xl font-bold text-slate-800">{t('menu.paused')}</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col gap-4">
                                {/* Resume - Green */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onClose}
                                    className="w-full py-4 bg-green-500 hover:bg-green-600 text-white text-2xl font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors"
                                >
                                    <Play size={28} fill="white" />
                                    <span>{t('menu.resume')}</span>
                                </motion.button>

                                {/* Restart - Yellow */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onRestart}
                                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white text-2xl font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors"
                                >
                                    <RotateCcw size={28} />
                                    <span>{t('menu.restart')}</span>
                                </motion.button>

                                {/* Settings - Blue/Slate */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onSettings}
                                    className="w-full py-4 bg-slate-600 hover:bg-slate-700 text-white text-2xl font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors"
                                >
                                    <Settings size={28} />
                                    <span>{t('menu.settings')}</span>
                                </motion.button>

                                {/* Exit - Red */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onExit}
                                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white text-2xl font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors"
                                >
                                    <Home size={28} />
                                    <span>{t('menu.exitToMap')}</span>
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
