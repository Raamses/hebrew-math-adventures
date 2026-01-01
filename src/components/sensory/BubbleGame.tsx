import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Bubble } from './Bubble';
import type { SensoryProblem } from '../../lib/gameLogic';
import { useSound } from '../../hooks/useSound';

interface BubbleGameProps {
    problem: SensoryProblem;
    onComplete: (success: boolean) => void;
}

export const BubbleGame: React.FC<BubbleGameProps> = ({ problem, onComplete }) => {
    const { playSound } = useSound();
    const [poppedIds, setPoppedIds] = useState<Set<string>>(new Set());
    const [poppedCount, setPoppedCount] = useState(0);
    const [mistakes, setMistakes] = useState(0);

    // Count how many targets exist
    const totalTargets = problem.items.filter(b => b.value === problem.target).length;

    useEffect(() => {
        // Reset state when problem changes
        setPoppedIds(new Set());
        setPoppedCount(0);
        setMistakes(0);
    }, [problem]);

    // We only need the items list once. If problem changes, this recalculates.
    // The KEY is that 'items' array reference must be stable if we want effective memoization,
    // although with primitive keys inside, React list diffing usually handles it.
    // But let's be safe.

    // Memoize the handler to prevent re-creation on every render
    const handlePop = React.useCallback((id: string, value: number) => {
        // We need functional updates to access latest state without adding dependencies that change often
        // Actually, since we only need poppedIds to check 'has', but here we are setting it...

        // Wait, if we use the function reference in the child, we can't depend on changing state in closure unless we use refs or functional updates.
        // Let's use the functional update pattern for the setter, but strictly we need to check if it's correct inside.
        // However, we need 'problem.target' which is stable per problem.

        let bubbleAlreadyPopped = false;
        setPoppedIds(prev => {
            if (prev.has(id)) {
                bubbleAlreadyPopped = true;
                return prev; // Already popped
            }

            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });

        if (bubbleAlreadyPopped) return; // If already popped, stop further processing

        // Check Logic - We can execute this side effect because we know the ID was validly clicked
        if (value === problem.target) {
            playSound('correct');

            setPoppedCount(prev => {
                const newCount = prev + 1;
                const totalTargets = problem.items.filter(b => b.value === problem.target).length;

                if (newCount >= totalTargets) {
                    setTimeout(() => onComplete(true), 1500);
                }
                return newCount;
            });

        } else {
            playSound('wrong');
            setMistakes(prev => prev + 1);
            // Penalize logic here is implicitly handled by adding to poppedIds
        }
    }, [problem.target, problem.items, onComplete, playSound]);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto bg-blue-50">
            {/* Instruction Overlay */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-6 py-2 rounded-full shadow-sm z-10 pointer-events-none">
                <h2 className="text-2xl font-bold text-slate-700">
                    Pop all the <span className="text-blue-600 text-3xl mx-1">{problem.target}</span>s!
                </h2>
            </div>

            {/* Render ALL bubbles, effectively static list to prevent re-renders of siblings */}
            {problem.items.map((b, i) => (
                <Bubble
                    key={b.id}
                    id={b.id}
                    value={b.value}
                    x={(i * 10) % 90 + 5}
                    delay={i * 1.5}
                    onClick={handlePop}
                    isPopped={poppedIds.has(b.id)}
                />
            ))}
        </div>
    );
};
