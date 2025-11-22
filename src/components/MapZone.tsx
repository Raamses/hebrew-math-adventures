import React from 'react';
import { Lock, CheckCircle, Play } from 'lucide-react';
import type { ZoneConfig } from '../lib/worldConfig';
import { motion } from 'framer-motion';

interface MapZoneProps {
    zone: ZoneConfig;
    currentLevel: number;
    onSelect: (zone: ZoneConfig) => void;
    index: number;
}

export const MapZone: React.FC<MapZoneProps> = ({ zone, currentLevel, onSelect, index }) => {
    const isLocked = currentLevel < zone.minLevel;
    const isCompleted = currentLevel > zone.maxLevel;
    const isActive = currentLevel >= zone.minLevel && currentLevel <= zone.maxLevel;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => !isLocked && onSelect(zone)}
            className={`
                relative w-full p-6 rounded-2xl shadow-lg mb-6 cursor-pointer transform transition-all duration-300
                ${isLocked ? 'bg-slate-100 opacity-75 grayscale' : 'bg-white hover:scale-105 hover:shadow-xl'}
                ${isActive ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
        >
            <div className="flex items-center justify-between rtl:flex-row-reverse">
                {/* Icon & Info */}
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-full ${isLocked ? 'bg-slate-200' : zone.backgroundClass}`}>
                        <zone.icon size={32} className={isLocked ? 'text-slate-400' : zone.themeColor} />
                    </div>
                    <div className="text-right">
                        <h3 className="text-xl font-bold text-slate-800">{zone.name}</h3>
                        <p className="text-sm text-slate-500">{zone.description}</p>
                        <span className="text-xs font-medium text-slate-400 mt-1 block">
                            שלבים {zone.minLevel}-{zone.maxLevel}
                        </span>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-center w-12 h-12">
                    {isLocked && <Lock className="text-slate-400" size={24} />}
                    {isCompleted && <CheckCircle className="text-green-500" size={28} />}
                    {isActive && (
                        <div className="bg-primary text-white p-2 rounded-full shadow-lg animate-pulse">
                            <Play size={20} fill="currentColor" />
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar for Active Zone (Optional visual flair) */}
            {isActive && (
                <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${((currentLevel - zone.minLevel) / (zone.maxLevel - zone.minLevel + 1)) * 100}%` }}
                    />
                </div>
            )}
        </motion.div>
    );
};
