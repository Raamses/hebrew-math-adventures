export interface Theme {
    id: string;
    name: string;
    nameHebrew: string;
    unlockLevel: number;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        accent: string;
    };
    backgroundImage?: string;
    backgroundPattern?: string;
}

export const THEMES: Theme[] = [
    {
        id: 'default',
        name: 'Default',
        nameHebrew: 'בְּרִירַת מֶחְדָּל',
        unlockLevel: 1,
        colors: {
            primary: '#f97316', // Orange
            secondary: '#3b82f6', // Blue
            background: '#f8fafc',
            surface: '#ffffff',
            text: '#1e293b',
            accent: '#8b5cf6'
        }
    },
    {
        id: 'forest',
        name: 'Forest',
        nameHebrew: 'יַעַר',
        unlockLevel: 3,
        colors: {
            primary: '#10b981', // Green
            secondary: '#84cc16', // Lime
            background: '#f0fdf4', // Light green
            surface: '#ffffff',
            text: '#064e3b',
            accent: '#065f46'
        },
        // Tree pattern - subtle dark green on light green
        backgroundPattern: 'data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M30 10 L40 30 L35 30 L42 45 L18 45 L25 30 L20 30 Z" fill="%2315803d" fill-opacity="0.1"/%3E%3C/svg%3E'
    },
    {
        id: 'space',
        name: 'Space',
        nameHebrew: 'חָלָל',
        unlockLevel: 5,
        colors: {
            primary: '#8b5cf6', // Purple
            secondary: '#06b6d4', // Cyan
            background: '#1e1b4b', // Dark blue
            surface: '#312e81',
            text: '#e0e7ff',
            accent: '#c084fc'
        },
        // Stars pattern - yellow/white stars on dark blue
        backgroundPattern: 'data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Ccircle cx="15" cy="15" r="1.5" fill="%23ffffff" fill-opacity="0.6"/%3E%3Ccircle cx="45" cy="30" r="1.5" fill="%23ffffff" fill-opacity="0.4"/%3E%3Cpath d="M50 10 L51 12 L53 12 L51.5 13.5 L52 15.5 L50 14 L48 15.5 L48.5 13.5 L47 12 L49 12 Z" fill="%23fbbf24" fill-opacity="0.5"/%3E%3C/svg%3E'
    },
    {
        id: 'candy',
        name: 'Candy',
        nameHebrew: 'סוּכָּרִיָּה',
        unlockLevel: 7,
        colors: {
            primary: '#ec4899', // Pink
            secondary: '#fbbf24', // Yellow
            background: '#fdf2f8', // Light pink
            surface: '#ffffff',
            text: '#831843',
            accent: '#f472b6'
        },
        // Dots/Candy pattern - pink/yellow on light pink
        backgroundPattern: 'data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Ccircle cx="10" cy="10" r="3" fill="%23db2777" fill-opacity="0.1"/%3E%3Ccircle cx="30" cy="30" r="2" fill="%23db2777" fill-opacity="0.1"/%3E%3Ccircle cx="30" cy="10" r="2" fill="%23f59e0b" fill-opacity="0.2"/%3E%3C/svg%3E'
    }
];

export const getThemeById = (id: string): Theme | undefined => {
    return THEMES.find(theme => theme.id === id);
};

export const getUnlockedThemes = (currentLevel: number): Theme[] => {
    return THEMES.filter(theme => currentLevel >= theme.unlockLevel);
};

export const isThemeUnlocked = (themeId: string, currentLevel: number): boolean => {
    const theme = getThemeById(themeId);
    return theme ? currentLevel >= theme.unlockLevel : false;
};
