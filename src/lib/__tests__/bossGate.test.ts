import { describe, it, expect } from 'vitest';
import { generateBossGate, type BossGateType } from '../bossGate';
import { MathModule } from '../../engines/MathModule';
import { INITIAL_CAPABILITY_PROFILE, type UserCapabilityProfile } from '../../types/progress';

describe('generateBossGate', () => {
    const mathModule = new MathModule();
    const profile: UserCapabilityProfile = { ...INITIAL_CAPABILITY_PROFILE, estimatedLevel: 3 };

    it('returns 3 problems', () => {
        const gate = generateBossGate(3, mathModule, profile);
        expect(gate.problems).toHaveLength(3);
    });

    it('gate type is deterministic per level (level 3 → rapid_fire)', () => {
        const gate3a = generateBossGate(3, mathModule, profile);
        const gate3b = generateBossGate(3, mathModule, profile);
        expect(gate3a.type).toBe('rapid_fire');
        expect(gate3b.type).toBe('rapid_fire');
    });

    it('gate type is deterministic per level (level 6 → missing_operand)', () => {
        const gate6 = generateBossGate(6, mathModule, profile);
        expect(gate6.type).toBe('missing_operand');
    });

    it('gate type is deterministic per level (level 9 → reverse_chain)', () => {
        const gate9 = generateBossGate(9, mathModule, profile);
        expect(gate9.type).toBe('reverse_chain');
    });

    it('missing operand problems have missing set to num1 or num2', () => {
        const gate = generateBossGate(6, mathModule, profile);
        expect(gate.type).toBe('missing_operand');
        for (const problem of gate.problems) {
            expect(problem.missing === 'num1' || problem.missing === 'num2').toBe(true);
        }
    });

    it('all problems are arithmetic type', () => {
        const gate3 = generateBossGate(3, mathModule, profile);
        const gate6 = generateBossGate(6, mathModule, profile);
        const gate9 = generateBossGate(9, mathModule, profile);

        for (const problem of [...gate3.problems, ...gate6.problems, ...gate9.problems]) {
            expect(problem.type).toBe('arithmetic');
        }
    });

    it('gate has correct label and icon', () => {
        const gate3 = generateBossGate(3, mathModule, profile);
        expect(gate3.label).toBe('Rapid Fire');
        expect(gate3.icon).toBe('🔥');

        const gate6 = generateBossGate(6, mathModule, profile);
        expect(gate6.label).toBe('Missing Number');
        expect(gate6.icon).toBe('❓');

        const gate9 = generateBossGate(9, mathModule, profile);
        expect(gate9.label).toBe('Reverse Chain');
        expect(gate9.icon).toBe('🔁');
    });

    it('missing_operand problems have valid answers (answer equals the missing operand)', () => {
        const gate = generateBossGate(6, mathModule, profile);
        for (const problem of gate.problems) {
            if (problem.missing === 'num1') {
                expect(problem.answer).toBe(problem.num1);
            } else if (problem.missing === 'num2') {
                expect(problem.answer).toBe(problem.num2);
            }
        }
    });

    it('rapid_fire problems have missing set to answer (normal problems)', () => {
        const gate = generateBossGate(3, mathModule, profile);
        expect(gate.type).toBe('rapid_fire');
        for (const problem of gate.problems) {
            expect(problem.missing).toBe('answer');
        }
    });
});