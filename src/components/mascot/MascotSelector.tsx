import React from 'react';
import { Mascot, type MascotCharacter } from './Mascot';

export const MASCOTS: { id: MascotCharacter; name: string }[] = [
    { id: 'owl', name: 'ינשוף' },
    { id: 'bear', name: 'דוב' },
    { id: 'ant', name: 'נמלה' },
    { id: 'lion', name: 'אריה' }
];

interface MascotSelectorProps {
    selectedMascot: MascotCharacter;
    onSelect: (mascot: MascotCharacter) => void;
}

export const MascotSelector: React.FC<MascotSelectorProps> = ({ selectedMascot, onSelect }) => {
    return (
        <div className="grid grid-cols-4 gap-2">
            {MASCOTS.map(mascot => (
                <button
                    key={mascot.id}
                    type="button"
                    onClick={() => onSelect(mascot.id)}
                    className={`flex flex-col items-center p-2 rounded-xl transition-all ${selectedMascot === mascot.id
                            ? 'bg-purple-100 ring-2 ring-purple-400 scale-105'
                            : 'hover:bg-slate-50'
                        }`}
                >
                    <div className="w-16 h-16">
                        <Mascot character={mascot.id} emotion="idle" />
                    </div>
                    <span className="text-sm font-bold text-slate-600 mt-1">{mascot.name}</span>
                </button>
            ))}
        </div>
    );
};
