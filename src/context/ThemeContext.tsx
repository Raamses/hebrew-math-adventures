import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getThemeById, THEMES, type Theme } from '../lib/themes';
import { useProfile } from './ProfileContext';
import type { ThemeId } from '../types/user';

interface ThemeContextType {
    currentTheme: Theme;
    setTheme: (themeId: ThemeId) => void;
    availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'hebrew-math-theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // We consume ProfileContext to sync theme
    // Note: ProfileProvider must wrap ThemeProvider in App.tsx
    const { profile, updateProfile } = useProfile();

    // Default to first theme or valid localStorage fallback (only for guests)
    const [guestTheme, setGuestTheme] = useState<Theme>(() => {
        try {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            return (saved && getThemeById(saved)) || THEMES[0];
        } catch {
            return THEMES[0];
        }
    });

    // ⚡ Bolt: Derived state instead of useEffect syncing to prevent cascading renders
    const currentTheme = (profile?.themeId && getThemeById(profile.themeId)) || guestTheme;

    // Apply theme CSS variables whenever theme changes
    useEffect(() => {
        const root = document.documentElement;

        // Apply color variables
        root.style.setProperty('--color-primary', currentTheme.colors.primary);
        root.style.setProperty('--color-secondary', currentTheme.colors.secondary);
        root.style.setProperty('--color-background', currentTheme.colors.background);
        root.style.setProperty('--color-surface', currentTheme.colors.surface);
        root.style.setProperty('--color-text', currentTheme.colors.text);
        root.style.setProperty('--color-accent', currentTheme.colors.accent);

        // Apply background pattern if exists
        if (currentTheme.backgroundPattern) {
            root.style.setProperty('--background-pattern', `url('${currentTheme.backgroundPattern}')`);
        } else {
            root.style.setProperty('--background-pattern', 'none');
        }

        // If NO profile is logged in, persist to localStorage for next guest visit
        if (!profile) {
            try {
                localStorage.setItem(THEME_STORAGE_KEY, currentTheme.id);
            } catch {
                // Ignore quota or security errors
            }
        }
    }, [currentTheme, profile]);

    const setTheme = (themeId: ThemeId) => {
        const theme = getThemeById(themeId);
        if (theme) {
            // If logged in, persist to profile
            if (profile) {
                updateProfile(profile.id, { themeId });
            } else {
                // Otherwise update guest state
                setGuestTheme(theme);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ currentTheme, setTheme, availableThemes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
