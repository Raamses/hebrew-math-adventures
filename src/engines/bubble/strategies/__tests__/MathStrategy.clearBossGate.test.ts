import { describe, it, expect } from 'vitest';
import { MathBehaviorStrategy } from '../MathStrategy';
import type { BossGate, BossGateType } from '../../../../lib/bossGate';
import type { ArithmeticProblem } from '../../../../lib/gameLogic';

// Helper: create a simple arithmetic problem
const makeProblem = (overrides: Partial<ArithmeticProblem> = {}): ArithmeticProblem => ({
    type: 'arithmetic',
    id: 'test-problem',
    num1: 3,
    num2: 4,
    operator: '+',
    missing: 'answer',
    answer: 7,
    ...overrides,
});

// Helper: create a BossGate
const makeGate = (type: BossGateType, problems: ArithmeticProblem[]): BossGate => {
    const labels: Record<BossGateType, string> = {
        rapid_fire: 'Rapid Fire',
        missing_operand: 'Missing Number',
        reverse_chain: 'Reverse Chain',
    };
    const icons: Record<BossGateType, string> = {
        rapid_fire: '🔥',
        missing_operand: '❓',
        reverse_chain: '🔁',
    };
    return { type, problems, label: labels[type], icon: icons[type] };
};

describe('MathBehaviorStrategy — clearBossGate (Fix d)', () => {
    describe('clearBossGate', () => {
        it('clears an active boss gate', () => {
            const strategy = new MathBehaviorStrategy();
            const p1 = makeProblem({ id: 'p1', answer: 7 });
            const p2 = makeProblem({ id: 'p2', answer: 14 });
            const gate = makeGate('rapid_fire', [p1, p2]);

            strategy.prepareBossGate(gate);
            expect(strategy.isBossGateActive()).toBe(true);

            strategy.clearBossGate();
            expect(strategy.isBossGateActive()).toBe(false);
        });

        it('resets bossGateIndex to 0', () => {
            const strategy = new MathBehaviorStrategy();
            const p1 = makeProblem({ id: 'p1' });
            const p2 = makeProblem({ id: 'p2' });
            const p3 = makeProblem({ id: 'p3' });
            const gate = makeGate('rapid_fire', [p1, p2, p3]);

            strategy.prepareBossGate(gate);
            strategy.advanceBossGateProblem(); // index → 1
            strategy.advanceBossGateProblem(); // index → 2
            expect(strategy.getBossGateIndex()).toBe(2);

            strategy.clearBossGate();
            expect(strategy.getBossGateIndex()).toBe(0);
        });

        it('is idempotent — safe to call when no gate is active', () => {
            const strategy = new MathBehaviorStrategy();
            // No gate active — should not throw
            expect(() => strategy.clearBossGate()).not.toThrow();
            expect(strategy.isBossGateActive()).toBe(false);
            expect(strategy.getBossGateIndex()).toBe(0);
        });

        it('is idempotent — calling twice after clear is safe', () => {
            const strategy = new MathBehaviorStrategy();
            const p1 = makeProblem({ id: 'p1' });
            const gate = makeGate('rapid_fire', [p1]);

            strategy.prepareBossGate(gate);
            strategy.clearBossGate();
            strategy.clearBossGate(); // second call — no-op

            expect(strategy.isBossGateActive()).toBe(false);
            expect(strategy.getBossGateIndex()).toBe(0);
        });

        it('allows prepareBossGate to work correctly after clearBossGate', () => {
            const strategy = new MathBehaviorStrategy();
            const p1 = makeProblem({ id: 'p1', answer: 5 });
            const gate1 = makeGate('rapid_fire', [p1]);

            strategy.prepareBossGate(gate1);
            strategy.clearBossGate();

            // Should be able to prepare a new gate
            const p2 = makeProblem({ id: 'p2', answer: 10 });
            const gate2 = makeGate('missing_operand', [p2]);
            strategy.prepareBossGate(gate2);

            expect(strategy.isBossGateActive()).toBe(true);
            expect(strategy.getBossGateIndex()).toBe(0);
            expect(strategy.getBossGateIcon()).toBe('❓');
        });
    });

    describe('clearBossGate vs advanceBossGateProblem — distinction', () => {
        it('clearBossGate resets without advancing through problems', () => {
            const strategy = new MathBehaviorStrategy();
            const p1 = makeProblem({ id: 'p1', answer: 7 });
            const p2 = makeProblem({ id: 'p2', answer: 14 });
            const p3 = makeProblem({ id: 'p3', answer: 21 });
            const gate = makeGate('rapid_fire', [p1, p2, p3]);

            strategy.prepareBossGate(gate);
            // Simulate boss defeat on first problem — clear immediately
            strategy.clearBossGate();

            // Gate is fully cleared, not advanced
            expect(strategy.isBossGateActive()).toBe(false);
            expect(strategy.getBossGateIndex()).toBe(0);
            expect(strategy.getBossGateProblemCount()).toBe(0);
        });
    });
});
