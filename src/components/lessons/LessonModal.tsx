import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../mascot/Mascot';
import { SpeechBubble } from '../mascot/SpeechBubble';
import { LessonEngine } from '../../engines/LessonEngine';
import type { LessonDefinition } from '../../types/lesson';

interface LessonModalProps {
    isOpen: boolean;
    lesson: LessonDefinition;
    onClose: () => void;
    onComplete: () => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({ isOpen, lesson, onClose, onComplete }) => {
    const { t } = useTranslation();
    const [engine] = useState(() => new LessonEngine(lesson));
    const [state, setState] = useState(engine.getCurrentState());

    // Subscribe to engine updates
    useEffect(() => {
        const unsubscribe = engine.subscribe((newState) => {
            setState({ ...newState });
        });
        return unsubscribe;
    }, [engine]);

    if (!isOpen) return null;

    const { currentStep, items, targets, isLastStep } = state;
    const canAdvance = engine.isStepComplete();

    const handleNext = () => {
        if (isLastStep) {
            onComplete();
        } else {
            engine.nextStep();
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="w-full max-w-5xl aspect-video bg-white rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col">

                {/* Header / Close */}
                <div className="absolute top-4 right-4 z-20">
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                        <X size={24} className="text-slate-600" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative bg-gradient-to-br from-indigo-50 to-blue-100">

                    {/* Targets (Baskets) Layer */}
                    {targets.map(target => (
                        <div
                            key={target.id}
                            data-target-id={target.id} // ID for Hit Testing
                            className="absolute transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${target.position.x}%`,
                                top: `${target.position.y}%`,
                                width: '120px',
                                height: '120px'
                            }}
                        >
                            <div className="w-full h-full bg-orange-200 rounded-full border-4 border-orange-400 flex items-center justify-center opacity-80 pointer-events-none">
                                <span className="text-orange-800 font-bold">{target.currentCount} / {target.capacity}</span>
                            </div>
                        </div>
                    ))}

                    {/* Draggables (Apples) Layer */}
                    {items.map(item => (
                        <motion.div
                            key={item.id}
                            drag={currentStep.type === 'interactive_drag'} // Only drag if step allows
                            dragMomentum={false}
                            whileDrag={{ scale: 1.2, zIndex: 100 }}
                            onDragEnd={(_e, info) => {
                                // Hit Testing logic
                                const point = info.point;
                                // Use elementsFromPoint to find dropped target
                                const elements = document.elementsFromPoint(point.x, point.y);
                                const targetEl = elements.find(el => el.getAttribute('data-target-id'));

                                if (targetEl) {
                                    const targetId = targetEl.getAttribute('data-target-id');
                                    // Notify engine
                                    if (targetId) engine.onItemDropped(item.id, targetId);
                                }
                            }}
                            className="absolute w-16 h-16 bg-red-500 rounded-full shadow-lg border-2 border-red-700 flex items-center justify-center cursor-grab active:cursor-grabbing text-white font-bold"
                            style={{
                                left: `${item.position.x}%`,
                                top: `${item.position.y}%`,
                            }}
                        >
                            <div className="w-4 h-8 bg-green-600 rounded-full absolute -top-2" />
                        </motion.div>
                    ))}

                </div>

                {/* Footer / Controls */}
                <div className="h-32 bg-white border-t border-slate-100 flex items-center px-8 relative">

                    {/* Mascot & Speech */}
                    <div className="absolute bottom-0 left-8 flex items-end">
                        <div className="w-32 h-32 relative z-10">
                            <Mascot character="owl" emotion={currentStep.mascotEmotion} />
                        </div>
                        <div className="mb-12 ml-4 relative z-0 w-96">
                            <SpeechBubble
                                text={currentStep.mascotText}
                                isVisible={true}
                                position="right" // Force bubbles to right side
                            />
                        </div>
                    </div>

                    {/* Next Button */}
                    <div className="ml-auto">
                        <button
                            onClick={handleNext}
                            disabled={!canAdvance}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-2xl font-bold transition-all ${canAdvance
                                ? 'bg-primary text-white shadow-lg hover:scale-105 active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            <span>{isLastStep ? t('summary.exit') : t('onboarding.start')}</span>
                            {isLastStep ? <Check size={28} /> : <ArrowRight size={28} />}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
