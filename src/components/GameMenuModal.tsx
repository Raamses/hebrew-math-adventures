import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Home, X } from 'lucide-react';

interface GameMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestart: () => void;
    onExit: () => void;
}

export const GameMenuModal: React.FC<GameMenuModalProps> = ({ isOpen, onClose, onRestart, onExit }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl p-8 z-50 w-full max-w-md"
                        dir="rtl"
                    >
                        {/* Close Button (Top-Right in RTL) */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        {/* Title */}
                        <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">תפריט משחק</h2>

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
                                <span>המשך לשחק</span>
                            </motion.button>

                            {/* Restart - Yellow */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onRestart}
                                className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white text-2xl font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors"
                            >
                                <RotateCcw size={28} />
                                <span>התחל מחדש</span>
                            </motion.button>

                            {/* Exit - Red */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onExit}
                                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white text-2xl font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors"
                            >
                                <Home size={28} />
                                <span>יציאה למפה</span>
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
