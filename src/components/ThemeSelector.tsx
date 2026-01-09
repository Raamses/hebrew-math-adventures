import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Star } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useProgress } from '../context/ProgressContext';
import { isThemeUnlocked, type Theme } from '../lib/themes';
import { cn } from '../lib/cn';

export const ThemeSelector: React.FC = () => {
    const { currentTheme, setTheme, availableThemes } = useTheme();
    const { totalStars } = useProgress();

    const handleThemeSelect = (theme: Theme) => {
        if (isThemeUnlocked(theme.id, totalStars)) {
            setTheme(theme.id);
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableThemes.map((theme) => {
                const unlocked = isThemeUnlocked(theme.id, totalStars);
                const isActive = currentTheme.id === theme.id;

                return (
                    <motion.button
                        key={theme.id}
                        type="button"
                        whileHover={unlocked ? { scale: 1.05 } : {}}
                        whileTap={unlocked ? { scale: 0.95 } : {}}
                        onClick={() => handleThemeSelect(theme)}
                        disabled={!unlocked}
                        className={cn(
                            "relative p-3 rounded-xl border-2 transition-all w-full text-left",
                            unlocked ? 'border-transparent hover:shadow-lg cursor-pointer' : 'border-slate-200 opacity-60 cursor-not-allowed',
                            isActive && 'ring-2 ring-offset-1 ring-primary'
                        )}
                        style={{
                            background: unlocked
                                ? `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 100%)`
                                : '#f1f5f9'
                        }}
                    >
                        {/* Active Indicator */}
                        {isActive && (
                            <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5">
                                <Check size={14} />
                            </div>
                        )}

                        {/* Lock Icon */}
                        {!unlocked && (
                            <div className="absolute top-2 right-2 text-slate-400">
                                <Lock size={16} />
                            </div>
                        )}

                        {/* Theme Name */}
                        <h3 className="text-lg font-bold mb-2" style={{ color: unlocked ? theme.colors.text : '#64748b' }}>
                            {theme.nameHebrew}
                        </h3>

                        {/* Color Preview */}
                        <div className="flex gap-1.5 mb-2">
                            <div
                                className="w-8 h-8 rounded-md shadow-sm"
                                style={{ backgroundColor: theme.colors.primary }}
                            />
                            <div
                                className="w-8 h-8 rounded-md shadow-sm"
                                style={{ backgroundColor: theme.colors.secondary }}
                            />
                            <div
                                className="w-8 h-8 rounded-md shadow-sm"
                                style={{ backgroundColor: theme.colors.accent }}
                            />
                        </div>

                        {/* Background Pattern Preview */}
                        {theme.backgroundPattern && (
                            <div
                                className="w-full h-10 rounded-md shadow-inner mb-2"
                                style={{
                                    backgroundColor: theme.colors.background,
                                    backgroundImage: `url("${theme.backgroundPattern}")`
                                }}
                            />
                        )}

                        {/* Unlock Info */}
                        {!unlocked && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                <Star size={12} className="fill-slate-400" />
                                <span>{theme.unlockStars}</span>
                            </div>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
};
