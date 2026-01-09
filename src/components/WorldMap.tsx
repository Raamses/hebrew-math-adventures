import React from 'react';
import { MapZone } from './MapZone';
import { WORLD_ZONES, type ZoneConfig } from '../lib/worldConfig';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface WorldMapProps {
    currentLevel: number;
    onZoneSelect: (zone: ZoneConfig) => void;
    onLogout: () => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export const WorldMap: React.FC<WorldMapProps> = ({ currentLevel, onZoneSelect, onLogout }) => {
    const { t } = useTranslation();
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pt-8">
            {/* Header */}
            <div className="w-full max-w-md flex items-center mb-8 px-2 relative h-12">
                <button
                    onClick={onLogout}
                    className="p-3 bg-white rounded-full shadow-md text-slate-600 hover:text-red-500 transition-colors z-10"
                    title={t('menu.logout')}
                    aria-label={t('menu.logout')}
                >
                    <LogOut size={24} />
                </button>

                <h1 className="text-3xl font-bold text-primary absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                    {t('app.worldMap')}
                </h1>
            </div>

            {/* Map Container */}
            <div
                className="w-full max-w-md lg:max-w-4xl flex-1 overflow-y-auto pb-20 pt-6 px-6 scrollbar-hide"
                role="region"
                aria-label={t('app.worldMap')}
            >
                <motion.div
                    className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:auto-rows-max"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {WORLD_ZONES.map((zone, index) => (
                        <motion.div key={zone.id} variants={itemVariants}>
                            <MapZone
                                zone={zone}
                                currentLevel={currentLevel}
                                onSelect={onZoneSelect}
                                index={index}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Footer / Decoration */}
            <div className="fixed bottom-0 w-full h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" aria-hidden="true" />
        </div>
    );
};


