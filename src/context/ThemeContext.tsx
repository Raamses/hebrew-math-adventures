import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getThemeById, THEMES, type Theme } from '../lib/themes';

interface ThemeContextType {
    currentTheme: Theme;
    setTheme: (themeId: string) => void;
    availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'hebrew-math-theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentThemeState] = useState<Theme>(THEMES[0]); // Default theme

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedThemeId) {
            const theme = getThemeById(savedThemeId);
            if (theme) {
                setCurrentThemeState(theme);
            }
        }
    }, []);

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

        // Save to localStorage
        localStorage.setItem(THEME_STORAGE_KEY, currentTheme.id);
    }, [currentTheme]);

    const setTheme = (themeId: string) => {
        const theme = getThemeById(themeId);
        if (theme) {
            setCurrentThemeState(theme);
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
