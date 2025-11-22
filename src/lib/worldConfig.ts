import { type LucideIcon, Palmtree, Trees, Mountain } from 'lucide-react';

export interface ZoneConfig {
    id: string;
    name: string;
    description: string;
    minLevel: number;
    maxLevel: number;
    icon: LucideIcon;
    themeColor: string; // Tailwind class or hex
    backgroundClass: string; // For dynamic background switching
}

export const WORLD_ZONES: ZoneConfig[] = [
    {
        id: 'addition_island',
        name: 'אי התוספות',
        description: 'למדו לחבר מספרים!',
        minLevel: 1,
        maxLevel: 2,
        icon: Palmtree,
        themeColor: 'text-emerald-500',
        backgroundClass: 'bg-emerald-50'
    },
    {
        id: 'subtraction_forest',
        name: 'יער החיסור',
        description: 'היזהרו מהמינוס!',
        minLevel: 3,
        maxLevel: 4,
        icon: Trees,
        themeColor: 'text-amber-600',
        backgroundClass: 'bg-amber-50'
    },
    {
        id: 'multiplication_mountain',
        name: 'הר הכפל',
        description: 'טפסו לפסגה!',
        minLevel: 5,
        maxLevel: 10, // Assuming 10 is max for now
        icon: Mountain,
        themeColor: 'text-indigo-600',
        backgroundClass: 'bg-indigo-50'
    }
];

export const getZoneForLevel = (level: number): ZoneConfig | undefined => {
    return WORLD_ZONES.find(z => level >= z.minLevel && level <= z.maxLevel);
};
