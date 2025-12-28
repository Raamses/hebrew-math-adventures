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
            {/* Remove overflow-hidden to allow mascot pop-out */}
            <div className="w-full max-w-5xl aspect-video bg-white rounded-[3rem] shadow-2xl relative flex flex-col">

                {/* Header / Close */}
                <div className="absolute top-4 right-4 z-20">
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                        <X size={24} className="text-slate-600" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative bg-gradient-to-br from-indigo-50 to-blue-100 rounded-t-[3rem] overflow-hidden">
                    {/* Note: We keep rounded corners via overflow-hidden on CONTENT, but not on the main wrapper so mascot can pop out at bottom if needed. 
                        Actually, if mascot is absolute bottom-0 of the wrapper, and wrapper has NO overflow hidden, it should show. 
                    */}

                    {/* Lesson Title - Only on first step */}
                    {state.progress === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="absolute top-1/4 left-0 w-full text-center z-10 px-4"
                        >
                            <h1 className="text-5xl md:text-7xl font-black text-indigo-600 drop-shadow-sm tracking-tight">
                                {t(lesson.title)}
                            </h1>
                            <div className="mt-4 w-24 h-2 bg-orange-400 mx-auto rounded-full opacity-80" />
                        </motion.div>
                    )}

                    {/* Targets (Baskets) Layer */}
                    {targets.map(target => (
                        <div
                            key={target.id}
                            data-target-id={target.id} // ID for Hit Testing
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all"
                            style={{
                                left: `${target.position.x}%`,
                                top: `${target.position.y}%`,
                                width: '140px',
                                height: '140px'
                            }}
                        >
                            {/* ... content ... */}
                            <div className="w-full h-full relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
                                    <path d="M 10 30 Q 50 100 90 30" fill="#D97706" stroke="#92400E" strokeWidth="3" />
                                    <ellipse cx="50" cy="30" rx="40" ry="10" fill="#F59E0B" stroke="#92400E" strokeWidth="3" />
                                    <g transform="translate(50, 60)">
                                        <circle r="20" fill="white" stroke="#F59E0B" strokeWidth="2" />
                                        <text x="0" y="5" textAnchor="middle" fill="#92400E" fontSize="16" fontWeight="bold">
                                            {target.currentCount} / {target.capacity}
                                        </text>
                                    </g>
                                </svg>
                            </div>
                        </div>
                    ))}

                    {/* Draggables (Apples) Layer */}
                    {items.map(item => (
                        <motion.div
                            key={item.id}
                            drag={currentStep.type === 'interactive_drag'}
                            dragMomentum={false}
                            whileDrag={{ scale: 1.2, zIndex: 100, rotate: 10 }}

                            onDragEnd={(_e, info) => {

                                const point = info.point;
                                const elements = document.elementsFromPoint(point.x, point.y);
                                const targetEl = elements.find(el => el.getAttribute('data-target-id'));

                                if (targetEl) {
                                    const targetId = targetEl.getAttribute('data-target-id');
                                    if (targetId) engine.onItemDropped(item.id, targetId);
                                }
                            }}
                            // Remove pointer events while dragging other items? No.
                            // But we need to ensure the dragged item doesn't BLOCK the drop target from elementsFromPoint?
                            // elementsFromPoint returns ALL layers. So it finds the target even if item is on top.
                            className="absolute w-20 h-20 flex items-center justify-center cursor-grab active:cursor-grabbing -ml-10 -mt-10 touch-none"
                            style={{
                                left: `${item.position.x}%`,
                                top: `${item.position.y}%`,
                            }}
                        >
                            {/* ... apple svg ... */}
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                                <path d="M 50 90 Q 20 90 20 60 Q 20 30 50 40 Q 80 30 80 60 Q 80 90 50 90" fill="#EF4444" stroke="#991B1B" strokeWidth="2" />
                                <path d="M 50 40 Q 40 10 70 10 Q 60 40 50 40" fill="#4ADE80" stroke="#166534" strokeWidth="2" />
                                <circle cx="35" cy="55" r="3" fill="white" opacity="0.4" />
                            </svg>
                        </motion.div>
                    ))}
                </div>

                {/* Equation Overlay */}
                {/* ... same ... */}
                {currentStep.showEquation && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                    >
                        <div className="bg-white/90 backdrop-blur-sm px-12 py-8 rounded-[3rem] shadow-2xl border-8 border-orange-300 transform -translate-y-12">
                            <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 drop-shadow-sm" dir="ltr">
                                {currentStep.showEquation}
                            </span>
                        </div>
                    </motion.div>
                )}


                {/* Footer / Controls */}
                <div className="h-32 bg-white border-t border-slate-100 flex items-center px-8 relative z-20 rounded-b-[3rem]">
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
                            <span>
                                {isLastStep ? t('lessons.controls.finish') : state.progress === 0 ? t('lessons.controls.start') : t('lessons.controls.next')}
                            </span>
                            {isLastStep ? <Check size={28} /> : <ArrowRight size={28} />}
                        </button>
                    </div>
                </div>

                {/* Mascot & Speech - OUTSIDE the clipped areas */}
                <div className="absolute bottom-0 left-8 z-50 flex items-end pb-4 filter drop-shadow-xl">
                    <div className="w-48 h-48 relative">
                        <Mascot character="owl" emotion={currentStep.mascotEmotion} />
                    </div>
                    {/* Speech Bubble Container */}
                    <div className="absolute left-32 bottom-32 w-80">
                        <SpeechBubble
                            text={t(currentStep.mascotText)}
                            isVisible={true}
                            position="right"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};
