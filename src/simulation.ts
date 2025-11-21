import { QuestionGenerator } from './engines/QuestionGenerator';

const generator = QuestionGenerator.getInstance();
const level = 3; // Test Level 3 for variety

console.log(`--- Simulation: Level ${level} ---`);

for (let i = 0; i < 10; i++) {
    const problem = generator.generate(level);
    console.log(`Q${i + 1}: ${problem.num1} ${problem.operator} ${problem.num2} = ${problem.answer} [${problem.subType || 'n/a'}]`);
}

console.log('--- End Simulation ---');
