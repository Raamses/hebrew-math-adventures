import type { ArithmeticProblem, Problem } from './gameLogic';
import { MathModule } from '../engines/MathModule';
import type { UserCapabilityProfile } from '../types/progress';
import { BOSS_GATE_PROBLEM_COUNT } from './worldConfig';

export type BossGateType = 'rapid_fire' | 'missing_operand' | 'reverse_chain';

export interface BossGate {
  type: BossGateType;
  problems: ArithmeticProblem[];
  label: string;
  icon: string;
}


export function generateBossGate(
  level: number,
  mathModule: MathModule,
  profile: UserCapabilityProfile
): BossGate {
  // Pick gate type based on level (deterministic per level for consistency)
  const types: BossGateType[] = ['rapid_fire', 'missing_operand', 'reverse_chain'];
  const type = types[(level / 3 - 1) % types.length]; // Boss levels are 3, 6, 9

  const problems: ArithmeticProblem[] = [];
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

  for (let i = 0; i < BOSS_GATE_PROBLEM_COUNT; i++) {
    // Generate an arithmetic problem, retrying if we get a different type
    let attempts = 0;
    let problem: Problem | null = null;

    while (attempts < 5 && !problem) {
      const generated = mathModule.generateProblem(
        { ...profile, estimatedLevel: level },
        { difficulty: level }
      );
      if (generated.type === 'arithmetic') {
        problem = generated;
      }
      attempts++;
    }

    if (!problem) {
      // Fallback: create a simple arithmetic problem
      problem = {
        type: 'arithmetic',
        id: `boss-gate-${level}-${i}`,
        num1: level + i,
        num2: i + 1,
        operator: '+',
        missing: 'answer',
        answer: (level + i) + (i + 1),
      };
    }

    const ap = problem as ArithmeticProblem;

    if (type === 'missing_operand') {
      // Force missing to 'num1' or 'num2'
      const modified: ArithmeticProblem = {
        ...ap,
        missing: i % 2 === 0 ? 'num1' : 'num2',
      };

      // Recalculate so the answer is the missing operand
      // Guard against division by zero
      const ans = Number(modified.answer);
      const safeNum1 = modified.num1 || 1;
      const safeNum2 = modified.num2 || 1;

      if (modified.missing === 'num1') {
        // We need: num1 OP num2 = result → solve for num1
        switch (modified.operator) {
          case '+':
            modified.num1 = ans - modified.num2;
            break;
          case '-':
            modified.num1 = ans + modified.num2;
            break;
          case '*':
            modified.num1 = Math.floor(ans / safeNum2);
            break;
          case '/':
            modified.num1 = ans * modified.num2;
            break;
        }
      } else if (modified.missing === 'num2') {
        switch (modified.operator) {
          case '+':
            modified.num2 = ans - modified.num1;
            break;
          case '-':
            // Ensure non-negative for kids' game
            modified.num2 = Math.max(0, modified.num1 - ans);
            break;
          case '*':
            modified.num2 = Math.floor(ans / safeNum1);
            break;
          case '/':
            modified.num2 = Math.max(1, Math.floor(modified.num1 / Math.max(1, ans)));
            break;
        }
      }

      // The answer is now the missing operand value
      modified.answer = modified.missing === 'num1' ? modified.num1 : modified.num2;
      problems.push(modified);
    } else {
      // rapid_fire or reverse_chain: use the problem as-is
      problems.push(ap);
    }
  }

  return {
    type,
    problems,
    label: labels[type],
    icon: icons[type],
  };
}