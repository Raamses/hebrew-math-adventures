import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { isThemeUnlocked, type Theme } from '../lib/themes';

interface ThemeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ isOpen, onClose }) => {
    const { currentTheme, setTheme, availableThemes } = useTheme();
    const { profile } = useProfile();

    if (!isOpen || !profile) return null;

    const handleThemeSelect = (theme: Theme) => {
        if (isThemeUnlocked(theme.id, profile.currentLevel)) {
            setTheme(theme.id);
        }
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
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8"
                        dir="rtl"
                    >
                        <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">ערכות נושא</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {availableThemes.map((theme) => {
                                const unlocked = isThemeUnlocked(theme.id, profile.currentLevel);
                                const isActive = currentTheme.id === theme.id;

                                return (
                                    <motion.div
                                        key={theme.id}
                                        whileHover={unlocked ? { scale: 1.05 } : {}}
                                        onClick={() => handleThemeSelect(theme)}
                                        className={`
                                            relative p-6 rounded-2xl border-4 cursor-pointer transition-all
                                            ${unlocked ? 'border-transparent hover:shadow-xl' : 'border-slate-200 opacity-60'}
                                            ${isActive ? 'ring-4 ring-offset-2 ring-primary' : ''}
                                        `}
                                        style={{
                                            background: unlocked
                                                ? `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 100%)`
                                                : '#f1f5f9'
                                        }}
                                    >
                                        {/* Active Indicator */}
                                        {isActive && (
                                            <div className="absolute top-3 right-3 bg-primary text-white rounded-full p-1">
                                                <Check size={16} />
                                            </div>
                                        )}

                                        {/* Lock Icon */}
                                        {!unlocked && (
                                            <div className="absolute top-3 right-3 text-slate-400">
                                                <Lock size={24} />
                                            </div>
                                        )}

                                        {/* Theme Name */}
                                        <h3 className="text-2xl font-bold mb-3" style={{ color: unlocked ? theme.colors.text : '#64748b' }}>
                                            {theme.nameHebrew}
                                        </h3>

                                        {/* Color Preview */}
                                        <div className="flex gap-2 mb-4">
                                            <div
                                                className="w-12 h-12 rounded-lg shadow-md"
                                                style={{ backgroundColor: theme.colors.primary }}
                                            />
                                            <div
                                                className="w-12 h-12 rounded-lg shadow-md"
                                                style={{ backgroundColor: theme.colors.secondary }}
                                            />
                                            <div
                                                className="w-12 h-12 rounded-lg shadow-md"
                                                style={{ backgroundColor: theme.colors.accent }}
                                            />
                                        </div>

                                        {/* Background Pattern Preview */}
                                        {theme.backgroundPattern && (
                                            <div
                                                className="w-full h-16 rounded-lg shadow-inner mb-3"
                                                style={{
                                                    backgroundColor: theme.colors.background,
                                                    backgroundImage: `url("${theme.backgroundPattern}")`
                                                }}
                                            />
                                        )}

                                        {/* Unlock Info */}
                                        {!unlocked && (
                                            <p className="text-sm text-slate-500 mt-2">
                                                🔒 נפתח ברמה {theme.unlockLevel}
                                            </p>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xl font-bold rounded-2xl transition-all"
                        >
                            סגור
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
