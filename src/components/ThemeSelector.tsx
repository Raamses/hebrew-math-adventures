import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { isThemeUnlocked, type Theme } from '../lib/themes';

export const ThemeSelector: React.FC = () => {
    const { currentTheme, setTheme, availableThemes } = useTheme();
    const { profile } = useProfile();

    if (!profile) return null;

    const handleThemeSelect = (theme: Theme) => {
        if (isThemeUnlocked(theme.id, profile.currentLevel)) {
            setTheme(theme.id);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir="rtl">
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
    );
};
