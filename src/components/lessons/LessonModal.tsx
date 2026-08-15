import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../mascot/Mascot';
import { SpeechBubble } from '../mascot/SpeechBubble';
import { LessonEngine } from '../../engines/LessonEngine';
import { InteractiveStoryScene } from './InteractiveStoryScene';
import { useAnalytics } from '../../hooks/useAnalytics';
import type { LessonDefinition } from '../../types/lesson';

interface LessonModalProps {
    isOpen: boolean;
    lesson: LessonDefinition;
    onClose: () => void;
    /** Called when the final step is completed. Receives the lesson's performance result for star-tiering. */
    onComplete: (performance: { correct: number; attempts: number }) => void;
    /** Saga node that opened this lesson — carried into the GA4 events. */
    nodeId?: string;
}

export const LessonModal: React.FC<LessonModalProps> = ({ isOpen, lesson, onClose, onComplete, nodeId }) => {
    const { t } = useTranslation();
    const { logEvent } = useAnalytics();
    const [engine] = useState(() => new LessonEngine(lesson));
    const [state, setState] = useState(engine.getCurrentState());

    // Subscribe to engine updates
    useEffect(() => {
        const unsubscribe = engine.subscribe((newState) => {
            setState({ ...newState });
        });
        return unsubscribe;
    }, [engine]);

    // GA4: one lesson_start per opened lesson.
    const startLoggedRef = useRef(false);
    useEffect(() => {
        if (!isOpen || startLoggedRef.current) return;
        startLoggedRef.current = true;
        logEvent('lesson_start', {
            lesson_id: lesson.id,
            node_id: nodeId,
            operation: lesson.operation,
            theme: lesson.theme,
            step_count: lesson.steps.length,
            mode: 'lesson',
        });
    }, [isOpen, lesson, nodeId, logEvent]);

    if (!isOpen) return null;

    const { currentStep, items, targets, isLastStep, stepIndex, stepCount, theme } = state;
    const canAdvance = engine.isStepComplete();

    const handleNext = () => {
        const performance = engine.getPerformance();

        // GA4: every step the child clears, including the final one.
        logEvent('lesson_step_complete', {
            lesson_id: lesson.id,
            node_id: nodeId,
            step_id: currentStep.id,
            step_index: stepIndex,
            step_type: currentStep.type,
            correct: performance.correct,
            attempts: performance.attempts,
            mode: 'lesson',
        });

        if (isLastStep) {
            logEvent('lesson_complete', {
                lesson_id: lesson.id,
                node_id: nodeId,
                operation: lesson.operation,
                correct: performance.correct,
                attempts: performance.attempts,
                total_mistakes: performance.attempts - performance.correct,
                mode: 'lesson',
            });
            onComplete(performance);
        } else {
            engine.nextStep();
        }
    };

    return (
        <div
            data-testid="lesson-modal"
            data-lesson-id={lesson.id}
            dir="rtl"
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md"
        >
            {/* Remove overflow-hidden to allow mascot pop-out */}
            <div className="w-full max-w-5xl aspect-video bg-white rounded-[3rem] shadow-2xl relative flex flex-col">

                {/* Header / Close */}
                <div className="absolute top-4 right-4 z-40">
                    <button
                        onClick={onClose}
                        aria-label={t('lessons.controls.close')}
                        className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
                    >
                        <X size={24} className="text-slate-600" />
                    </button>
                </div>

                {/* Main Content Area — the themed story stage */}
                <div className="flex-1 relative rounded-t-[3rem] overflow-hidden">
                    <InteractiveStoryScene
                        stepType={currentStep.type}
                        items={items}
                        targets={targets}
                        theme={theme}
                        onDrop={(itemId, targetId) => engine.onItemDropped(itemId, targetId)}
                        onTap={(itemId) => engine.onItemTapped(itemId)}
                    />

                    {/* Lesson Title - Only on first step */}
                    {stepIndex === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="absolute top-6 left-0 w-full text-center z-30 px-4 pointer-events-none"
                        >
                            <h1 className="text-4xl md:text-6xl font-black text-indigo-700 drop-shadow-[0_2px_6px_rgba(255,255,255,0.9)] tracking-tight">
                                {t(lesson.title)}
                            </h1>
                            <div className="mt-3 w-24 h-2 bg-orange-400 mx-auto rounded-full opacity-80" />
                        </motion.div>
                    )}
                </div>

                {/* Equation Overlay */}
                {currentStep.showEquation && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                    >
                        <div className="bg-white/90 backdrop-blur-sm px-12 py-8 rounded-[3rem] shadow-2xl border-8 border-orange-300 transform -translate-y-12">
                            <span
                                data-testid="lesson-equation"
                                className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 drop-shadow-sm"
                                dir="ltr"
                            >
                                {currentStep.showEquation}
                            </span>
                        </div>
                    </motion.div>
                )}

                {/* Footer / Controls */}
                <div className="h-32 bg-white border-t border-slate-100 flex items-center px-8 relative z-20 rounded-b-[3rem]">
                    {/* Step progress + optional hint, kept clear of the mascot on the right-hand (RTL start) side */}
                    <div className="mr-auto ml-8 text-right hidden md:block">
                        <div data-testid="lesson-step-progress" className="text-lg font-bold text-slate-500">
                            {t('lessons.controls.stepProgress', { current: stepIndex + 1, total: stepCount })}
                        </div>
                        {currentStep.hint && !canAdvance && (
                            <div className="text-base text-slate-400">{t(currentStep.hint)}</div>
                        )}
                    </div>

                    {/* Next Button */}
                    <div className="ml-auto">
                        <button
                            data-testid="lesson-next"
                            onClick={handleNext}
                            disabled={!canAdvance}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-2xl font-bold transition-all ${canAdvance
                                ? 'bg-primary text-white shadow-lg hover:scale-105 active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            <span>
                                {isLastStep ? t('lessons.controls.finish') : stepIndex === 0 ? t('lessons.controls.start') : t('lessons.controls.next')}
                            </span>
                            {isLastStep ? <Check size={28} /> : <ArrowRight size={28} />}
                        </button>
                    </div>
                </div>

                {/* Mascot & Speech - OUTSIDE the clipped areas */}
                <div className="absolute bottom-0 left-8 z-50 flex items-end pb-4 filter drop-shadow-xl pointer-events-none">
                    <div className="w-40 h-40 relative">
                        <Mascot character="owl" emotion={currentStep.mascotEmotion} />
                    </div>
                    {/* Speech Bubble Container */}
                    <div className="absolute left-28 bottom-28 w-80">
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
