import React, { useState, useEffect, useCallback } from 'react';
import { Explosion } from './Explosion';
import { Bubble } from './Bubble';
import type { SensoryProblem } from '../../lib/gameLogic';
import { useSound } from '../../hooks/useSound';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { SettingsMenu } from '../SettingsMenu';
import { SessionProgressBar } from '../SessionProgressBar';
import { GameMenuModal } from '../GameMenuModal';
import { SettingsModal } from '../SettingsModal';

interface BubbleGameProps {
    problem: SensoryProblem;
    onComplete: (success: boolean) => void;
    onExit?: () => void;
    title?: string;
    instruction?: string;
}

export const BubbleGame: React.FC<BubbleGameProps> = ({ problem, onComplete, onExit, title, instruction }) => {
    const { playSound, isMuted, toggleMute } = useSound();
    const { t } = useTranslation();
    const { profile } = useProfile();

    // Game State
    const [poppedIds, setPoppedIds] = useState<Set<string>>(new Set());
    const [poppedCount, setPoppedCount] = useState(0); // Using this for progress
    const [explosions, setExplosions] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        // Reset state when problem changes
        setPoppedIds(new Set());
        setPoppedCount(0);
        setExplosions([]);
    }, [problem]);

    const totalTargets = problem.items.filter(b => b.value === problem.target).length;

    const handlePop = useCallback((id: string, value: number, x: number, y: number) => {
        let bubbleAlreadyPopped = false;
        setPoppedIds(prev => {
            if (prev.has(id)) {
                bubbleAlreadyPopped = true;
                return prev;
            }
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });

        if (bubbleAlreadyPopped) return;

        // Visual Effects
        const isCorrect = value === problem.target;
        if (isCorrect) {
            console.log('Correct Pop at:', x, y);
            setExplosions(prev => [...prev, { id: Date.now(), x, y, color: '#F59E0B' }]); // Amber-500 (Darker Gold)
            playSound('correct');
            setPoppedCount(prev => {
                const newCount = prev + 1;
                if (newCount >= totalTargets) {
                    setTimeout(() => onComplete(true), 1500);
                }
                return newCount;
            });
        } else {
            setExplosions(prev => [...prev, { id: Date.now(), x, y, color: '#EF4444' }]); // Red for wrong
            playSound('wrong');
        }
    }, [problem.target, totalTargets, onComplete, playSound]);

    const removeExplosion = (id: number) => {
        setExplosions(prev => prev.filter(e => e.id !== id));
    };

    const handleExit = () => {
        if (onExit) onExit();
        else onComplete(false);
    };

    return (
        <div className="w-full min-h-screen bg-blue-50 flex flex-col items-center relative overflow-hidden">
            {/* Header Area - Matches PracticeMode */}
            <div className="w-full max-w-md flex flex-col items-center gap-2 z-20 p-4 pb-0">
                <div className="w-full flex items-center justify-between relative h-12">
                    {/* Streak / Profile Info */}
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-blue-100 z-10">
                        <Zap size={16} className="text-orange-500 fill-orange-500" />
                        <span className="font-bold text-slate-700 text-sm">{profile?.streak || 0}</span>
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <h1 className="text-2xl font-bold text-blue-600 whitespace-nowrap drop-shadow-sm">
                            {title || t('saga.node_1_1_title')}
                        </h1>
                        {instruction && (
                            <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-2xl shadow-sm border border-blue-100 mt-1">
                                <span
                                    className="text-xl sm:text-2xl font-bold text-blue-600 tracking-wider font-mono"
                                    dir="ltr"
                                    style={{ unicodeBidi: 'isolate' }}
                                >
                                    {instruction}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Settings / Menu */}
                    <div className="z-20">
                        <SettingsMenu
                            onPause={() => setIsMenuOpen(true)}
                            onToggleMute={toggleMute}
                            isMuted={isMuted}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                        />
                    </div>
                </div>

                {/* Progress Bar */}
                <SessionProgressBar current={poppedCount} total={totalTargets} />
            </div>


            {/* Game Area */}
            <div className="flex-grow w-full relative z-0 mt-4 overflow-hidden">
                {problem.items.map((b, i) => (
                    <Bubble
                        key={b.id}
                        id={b.id}
                        value={b.value}
                        x={(i * 10) % 90 + 5}
                        delay={i * 1.5}
                        onClick={handlePop}
                        isPopped={poppedIds.has(b.id)}
                        variant={b.variant}
                    />
                ))}

                {/* Particle Effects Layer */}
                {explosions.map(e => (
                    <Explosion
                        key={e.id}
                        x={e.x}
                        y={e.y}
                        color={e.color}
                        onComplete={() => removeExplosion(e.id)}
                    />
                ))}
            </div>

            {/* Modals */}
            <GameMenuModal
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onRestart={() => {
                    setPoppedIds(new Set());
                    setPoppedCount(0);
                    setIsMenuOpen(false);
                }}
                onExit={handleExit}
                onSettings={() => {
                    setIsMenuOpen(false);
                    setIsSettingsOpen(true);
                }}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};
