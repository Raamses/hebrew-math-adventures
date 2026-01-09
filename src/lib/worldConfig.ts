import { type LucideIcon, Palmtree, Trees, Mountain, Sparkles } from 'lucide-react';

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
        id: 'sensory_beach',
        name: 'zones.sensory.name',
        description: 'zones.sensory.desc',
        minLevel: 0,
        maxLevel: 10, // Always active for current levels
        icon: Sparkles,
        themeColor: 'text-blue-400',
        backgroundClass: 'bg-blue-50'
    },
    {
        id: 'addition_island',
        name: 'zones.addition.name',
        description: 'zones.addition.desc',
        minLevel: 1,
        maxLevel: 2,
        icon: Palmtree,
        themeColor: 'text-emerald-500',
        backgroundClass: 'bg-emerald-50'
    },
    {
        id: 'subtraction_forest',
        name: 'zones.subtraction.name',
        description: 'zones.subtraction.desc',
        minLevel: 3,
        maxLevel: 4,
        icon: Trees,
        themeColor: 'text-amber-600',
        backgroundClass: 'bg-amber-50'
    },
    {
        id: 'multiplication_mountain',
        name: 'zones.multiplication.name',
        description: 'zones.multiplication.desc',
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
