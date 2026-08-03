import { describe, it, expect } from 'vitest';
import { MathBehaviorStrategy } from '../MathStrategy';
import type { GameConfig } from '../../types';

// Minimal valid GameConfig factory (matches MathStrategy.test.ts)
const makeConfig = (): GameConfig => ({
    modeName: 'test',
    spawnIntervalMs: 1000,
    maxOnScreen: 8,
    distractorRatio: 2,
    baseVelocity: 0.5,
    winCondition: { type: 'target_count', value: 10 },
    failCondition: { type: 'strikes', value: 3 },
    difficultyScale: 'linear',
    levelMultiplier: 1.0,
    theme: 'space',
    vfxEnabled: true,
});

describe('MathBehaviorStrategy — ADR 2026-08-zen-answer-race (Fix 2: anti-repeat)', () => {
    it('never admits a duplicate via the adjacent-level fallback path', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeConfig();

        // Prime recentSignatures with a specific problem so the fallback path
        // is forced to try to collide with it.
        const sig = (strategy as any).problemSignature({
            type: 'arithmetic',
            id: 'seed',
            num1: 5,
            num2: 3,
            operator: '+',
            missing: 'answer',
            answer: 8,
        });
        (strategy as any).recentSignatures = [sig];

        // Force the generator into the collision path repeatedly. With the final
        // re-check (Fix 2), the current problem must NEVER equal the last
        // signature's problem.
        for (let i = 0; i < 60; i++) {
            strategy.regenerateProblem(1, config);
            const problem = (strategy as any).currentProblem;
            expect(problem).not.toBeNull();
            const currentSig = (strategy as any).problemSignature(problem);
            const recent = (strategy as any).recentSignatures as string[];
            // The just-generated problem's signature must not be the immediately
            // preceding one (no back-to-back duplicate).
            if (recent.length >= 2) {
                expect(currentSig).not.toBe(recent[recent.length - 2]);
            }
        }
    });

    it('trivial signatures (0+0, 1-1, 0*N) are excluded at ALL correct-counts', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeConfig();

        // correctCount = 0 (was the gate: previously only >= 3 excluded trivials)
        for (let i = 0; i < 60; i++) {
            strategy.regenerateProblem(1, config, 0);
            const problem = (strategy as any).currentProblem;
            const sig = (strategy as any).problemSignature(problem);
            // 0+0=0 → arithmetic:0:+:0:0
            // 1-1=0 → arithmetic:1:-:1:0
            // 0*N=0 → arithmetic:0:*:N:0
            expect(sig).not.toBe('arithmetic:0:+:0:0');
            expect(sig).not.toBe('arithmetic:1:-:1:0');
            expect(sig).not.toMatch(/^arithmetic:0:\*:[0-9]:0$/);
        }
    });
});
