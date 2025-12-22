import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { MascotId } from '../../types/user';
import { useTranslation } from 'react-i18next';

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
                    onClick={() => onSelect(mascot.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-4 rounded-2xl border-2 transition-all ${selectedMascot === mascot.id
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-200 hover:border-primary/50'
                        }`}
                >
                    <div className="text-4xl mb-2">
                        <img
                            src={`/assets/mascots/${mascot.id}.png`} // Assuming you have these or use emojis/placeholders for now
                            alt={t(`mascot.names.${mascot.id}`)}
                            className="w-16 h-16 mx-auto object-contain"
                            onError={(e) => {
                                // Fallback to emoji if image missing
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerText =
                                    mascot.id === 'owl' ? '🦉' :
                                        mascot.id === 'bear' ? '🐻' :
                                            mascot.id === 'ant' ? '🐜' : '🦁';
                            }}
                        />
                    </div>
                    <div className="font-bold text-slate-700">{t(`mascot.names.${mascot.id}`)}</div>

                    {selectedMascot === mascot.id && (
                        <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                            <Check size={16} />
                        </div>
                    )}
                </motion.button>
            ))}
        </div>
    );
};
