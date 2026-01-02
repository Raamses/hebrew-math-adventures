import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { MascotId } from '../../types/user';
import { useTranslation } from 'react-i18next';
import { Mascot } from './Mascot';

interface MascotOption {
    id: MascotId;
}

const MASCOTS: MascotOption[] = [
    { id: 'owl' },
    { id: 'bear' },
    { id: 'ant' },
    { id: 'lion' }
];

interface MascotSelectorProps {
    selectedMascot: MascotId;
    onSelect: (mascot: MascotId) => void;
}

export const MascotSelector: React.FC<MascotSelectorProps> = ({ selectedMascot, onSelect }) => {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-2 gap-4">
            {MASCOTS.map((mascot) => (
                <motion.button
                    key={mascot.id}
                    type="button"
                    onClick={() => onSelect(mascot.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-4 rounded-2xl border-2 transition-all overflow-hidden ${selectedMascot === mascot.id
                        ? 'border-primary bg-primary/10 shadow-lg'
                        : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                        }`}
                >
                    <div className="mb-2 w-full flex justify-center h-24">
                        <Mascot
                            character={mascot.id}
                            emotion={selectedMascot === mascot.id ? 'happy' : 'idle'}
                            className="w-24 h-24"
                        />
                    </div>
                    <div className="font-bold text-slate-700">{t(`mascot.names.${mascot.id}`)}</div>

                    {selectedMascot === mascot.id && (
                        <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 animate-in zoom-in fade-in duration-300">
                            <Check size={16} />
                        </div>
                    )}
                </motion.button>
            ))}
        </div>
    );
};
