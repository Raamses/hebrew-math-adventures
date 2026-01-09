import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Star } from 'lucide-react';
import type { MascotId } from '../../types/user';
import { useTranslation } from 'react-i18next';
import { Mascot } from './Mascot';
import { useProgress } from '../../context/ProgressContext';
import { cn } from '../../lib/cn';

interface MascotOption {
    id: MascotId;
    unlockStars: number;
}

const MASCOTS: MascotOption[] = [
    { id: 'owl', unlockStars: 0 },
    { id: 'bear', unlockStars: 50 },
    { id: 'ant', unlockStars: 100 },
    { id: 'lion', unlockStars: 150 }
];

interface MascotSelectorProps {
    selectedMascot: MascotId;
    onSelect: (mascot: MascotId) => void;
}

export const MascotSelector: React.FC<MascotSelectorProps> = ({ selectedMascot, onSelect }) => {
    const { t } = useTranslation();
    const { totalStars } = useProgress();

    return (
        <div className="grid grid-cols-2 gap-4">
            {MASCOTS.map((mascot) => {
                const isUnlocked = totalStars >= mascot.unlockStars;
                const isSelected = selectedMascot === mascot.id;

                return (
                    <motion.button
                        key={mascot.id}
                        type="button"
                        onClick={() => isUnlocked && onSelect(mascot.id)}
                        disabled={!isUnlocked}
                        whileHover={isUnlocked ? { scale: 1.05 } : {}}
                        whileTap={isUnlocked ? { scale: 0.95 } : {}}
                        className={cn(
                            "relative p-4 rounded-2xl border-2 transition-all overflow-hidden text-left",
                            isSelected
                                ? 'border-primary bg-primary/10 shadow-lg'
                                : isUnlocked
                                    ? 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                                    : 'border-slate-200 opacity-60 bg-slate-50 cursor-not-allowed'
                        )}
                    >
                        <div className="mb-2 w-full flex justify-center h-24">
                            <Mascot
                                character={mascot.id}
                                emotion={isSelected ? 'happy' : 'idle'}
                                className={cn("w-24 h-24", !isUnlocked && "grayscale opacity-50")}
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="font-bold text-slate-700">{t(`mascot.names.${mascot.id}`)}</div>

                            {!isUnlocked && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
                                    <Star size={10} className="fill-slate-500" />
                                    <span>{mascot.unlockStars}</span>
                                </div>
                            )}
                        </div>

                        {isSelected && (
                            <motion.div
                                className="absolute top-2 right-2 bg-primary text-white rounded-full p-1"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <Check size={16} />
                            </motion.div>
                        )}

                        {!isUnlocked && !isSelected && (
                            <div className="absolute top-2 right-2 text-slate-400">
                                <Lock size={16} />
                            </div>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
};
