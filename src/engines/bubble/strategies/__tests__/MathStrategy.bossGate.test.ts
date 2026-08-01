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

describe('MathBehaviorStrategy — Boss Gate', () => {
    describe('prepareBossGate', () => {
        it('sets the current problem to gate.problems[0]', () => {
            const strategy = new MathBehaviorStrategy();
            const problem1 = makeProblem({ id: 'p1', num1: 5, num2: 3, answer: 8 });
            const problem2 = makeProblem({ id: 'p2', num1: 10, num2: 4, answer: 14 });
            const gate = makeGate('rapid_fire', [problem1, problem2]);

            strategy.prepareBossGate(gate);

            const currentProblem = (strategy as any).currentProblem;
            expect(currentProblem).toBe(problem1);
            expect((strategy as any).targetValue).toBe(8);
        });

        it('sets bossGateIndex to 0', () => {
            const strategy = new MathBehaviorStrategy();
            const problem = makeProblem();
            const gate = makeGate('rapid_fire', [problem]);

            strategy.prepareBossGate(gate);

            expect((strategy as any).bossGateIndex).toBe(0);
        });

        it('sets bossGate to the provided gate', () => {
            const strategy = new MathBehaviorStrategy();
            const problem = makeProblem();
            const gate = makeGate('rapid_fire', [problem]);

            strategy.prepareBossGate(gate);

            expect((strategy as any).bossGate).toBe(gate);
        });
    });

    describe('advanceBossGateProblem', () => {
        it('returns true when more problems remain', () => {
            const strategy = new MathBehaviorStrategy();
            const p1 = makeProblem({ id: 'p1', answer: 7 });
            const p2 = makeProblem({ id: 'p2', answer: 14 });
            const p3 = makeProblem({ id: 'p3', answer: 21 });
            const gate = makeGate('rapid_fire', [p1, p2, p3]);

            strategy.prepareBossGate(gate);

            const firstAdvance = strategy.advanceBossGateProblem();
            expect(firstAdvance).toBe(true);

            // Should now be on problem 2
            const currentProblem = (strategy as any).currentProblem;
            expect(currentProblem).toBe(p2);
            expect((strategy as any).targetValue).toBe(14);

            const secondAdvance = strategy.advanceBossGateProblem();
            expect(secondAdvance).toBe(true);

            // Should now be on problem 3
            const currentProblem3 = (strategy as any).currentProblem;
            expect(currentProblem3).toBe(p3);
            expect((strategy as any).targetValue).toBe(21);
        });

        it('returns false when gate is complete', () => {
            const strategy = new MathBehaviorStrategy();
            const p1 = makeProblem({ id: 'p1', answer: 7 });
            const p2 = makeProblem({ id: 'p2', answer: 14 });
            const p3 = makeProblem({ id: 'p3', answer: 21 });
            const gate = makeGate('rapid_fire', [p1, p2, p3]);

            strategy.prepareBossGate(gate);

            strategy.advanceBossGateProblem(); // → p2
            strategy.advanceBossGateProblem(); // → p3
            const finalAdvance = strategy.advanceBossGateProblem(); // → done

            expect(finalAdvance).toBe(false);
        });

        it('clears bossGate to null when complete', () => {
            const strategy = new MathBehaviorStrategy();
            const p1 = makeProblem({ id: 'p1' });
            const gate = makeGate('rapid_fire', [p1]);

            strategy.prepareBossGate(gate);
            const result = strategy.advanceBossGateProblem();

            expect(result).toBe(false);
            expect((strategy as any).bossGate).toBeNull();
            expect((strategy as any).bossGateIndex).toBe(0);
        });

        it('returns false when no gate is active', () => {
            const strategy = new MathBehaviorStrategy();
            const result = strategy.advanceBossGateProblem();
            expect(result).toBe(false);
        });
    });

    describe('isBossGateActive', () => {
        it('returns false before prepareBossGate is called', () => {
            const strategy = new MathBehaviorStrategy();
            expect(strategy.isBossGateActive()).toBe(false);
        });

        it('returns true after prepareBossGate is called', () => {
            const strategy = new MathBehaviorStrategy();
            const problem = makeProblem();
            const gate = makeGate('rapid_fire', [problem]);

            strategy.prepareBossGate(gate);
            expect(strategy.isBossGateActive()).toBe(true);
        });

        it('returns false after gate is completed', () => {
            const strategy = new MathBehaviorStrategy();
            const problem = makeProblem();
            const gate = makeGate('rapid_fire', [problem]);

            strategy.prepareBossGate(gate);
            strategy.advanceBossGateProblem(); // completes the gate
            expect(strategy.isBossGateActive()).toBe(false);
        });
    });

    describe('getInstruction — missing operand rendering', () => {
        it('renders ? + 5 = 12 format when missing is num1', () => {
            const strategy = new MathBehaviorStrategy();
            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-missing-num1',
                num1: 7,  // The answer (unknown to player)
                num2: 5,
                operator: '+',
                missing: 'num1',
                answer: 7,  // answer is the missing operand
            };
            const gate = makeGate('missing_operand', [problem]);

            strategy.prepareBossGate(gate);
            const instruction = strategy.getInstruction();

            // Should show: ? + 5 = 12 (7 + 5 = 12)
            expect(instruction).toBe('? + 5 = 12');
        });

        it('renders 7 + ? = 12 format when missing is num2', () => {
            const strategy = new MathBehaviorStrategy();
            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-missing-num2',
                num1: 7,
                num2: 5,  // The answer (unknown to player)
                operator: '+',
                missing: 'num2',
                answer: 5,
            };
            const gate = makeGate('missing_operand', [problem]);

            strategy.prepareBossGate(gate);
            const instruction = strategy.getInstruction();

            // Should show: 7 + ? = 12 (7 + 5 = 12)
            expect(instruction).toBe('7 + ? = 12');
        });

        it('renders normal format when missing is answer (rapid_fire)', () => {
            const strategy = new MathBehaviorStrategy();
            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-normal',
                num1: 7,
                num2: 5,
                operator: '+',
                missing: 'answer',
                answer: 12,
            };
            const gate = makeGate('rapid_fire', [problem]);

            strategy.prepareBossGate(gate);
            const instruction = strategy.getInstruction();

            expect(instruction).toBe('7 + 5 = ?');
        });

        it('renders subtraction missing operand correctly', () => {
            const strategy = new MathBehaviorStrategy();
            // 12 - ? = 7 → answer is 5
            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-sub-missing',
                num1: 12,
                num2: 5,
                operator: '-',
                missing: 'num2',
                answer: 5,
            };
            const gate = makeGate('missing_operand', [problem]);

            strategy.prepareBossGate(gate);
            const instruction = strategy.getInstruction();

            // Should show: 12 - ? = 7
            expect(instruction).toBe('12 - ? = 7');
        });
    });

    describe('getBossGateIcon, getBossGateLabel, getBossGateIndex', () => {
        it('returns gate icon and label', () => {
            const strategy = new MathBehaviorStrategy();
            const problem = makeProblem();
            const gate = makeGate('missing_operand', [problem, makeProblem({ id: 'p2' }), makeProblem({ id: 'p3' })]);

            strategy.prepareBossGate(gate);

            expect(strategy.getBossGateIcon()).toBe('❓');
            expect(strategy.getBossGateLabel()).toBe('Missing Number');
        });

        it('returns gate index (0-based)', () => {
            const strategy = new MathBehaviorStrategy();
            const p1 = makeProblem({ id: 'p1' });
            const p2 = makeProblem({ id: 'p2' });
            const gate = makeGate('rapid_fire', [p1, p2]);

            strategy.prepareBossGate(gate);
            expect(strategy.getBossGateIndex()).toBe(0);

            strategy.advanceBossGateProblem();
            expect(strategy.getBossGateIndex()).toBe(1);
        });

        it('returns default icon and empty label when no gate active', () => {
            const strategy = new MathBehaviorStrategy();
            expect(strategy.getBossGateIcon()).toBe('🛡️');
            expect(strategy.getBossGateLabel()).toBe('');
        });
    });

    describe('getMathModule', () => {
        it('returns the MathModule instance', () => {
            const strategy = new MathBehaviorStrategy();
            const module = strategy.getMathModule();
            expect(module).toBeDefined();
            expect(typeof module.generateProblem).toBe('function');
        });
    });
});
