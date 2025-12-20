import React from 'react';
import { MapZone } from './MapZone';
import { WORLD_ZONES, type ZoneConfig } from '../lib/worldConfig';
import { LogOut } from 'lucide-react';

interface WorldMapProps {
    currentLevel: number;
    onZoneSelect: (zone: ZoneConfig) => void;
    onLogout: () => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({ currentLevel, onZoneSelect, onLogout }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pt-8">
            {/* Header */}
            <div className="w-full max-w-md flex items-center mb-8 px-2 relative h-12">
                <button
                    onClick={onLogout}
                    className="p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-red-500 transition-colors z-10"
                    title="התנתק"
                >
                    <LogOut size={24} />
                </button>

                <h1 className="text-3xl font-bold text-primary absolute left-1/2 -translate-x-1/2 whitespace-nowrap">מפת העולם</h1>


            </div>

            {/* Map Container */}
            <div className="w-full max-w-md flex-1 overflow-y-auto pb-20 px-6 scrollbar-hide">
                <div className="space-y-6">
                    {WORLD_ZONES.map((zone, index) => (
                        <MapZone
                            key={zone.id}
                            zone={zone}
                            currentLevel={currentLevel}
                            onSelect={onZoneSelect}
                            index={index}
                        />
                    ))}
                </div>
            </div>

            {/* Footer / Decoration */}
            <div className="fixed bottom-0 w-full h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>
    );
};
