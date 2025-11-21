import { QuestionGenerator } from './engines/QuestionGenerator';

const generator = QuestionGenerator.getInstance();

console.log('--- Level 1 Test (Single-digit for 6-year-olds) ---');
for (let i = 0; i < 10; i++) {
    const problem = generator.generate(1);
    console.log(`Q${i + 1}: ${problem.num1} ${problem.operator} ${problem.num2} = ${problem.answer}`);
}

console.log('\n--- Level 2 Test (2-digit) ---');
generator.reset();
for (let i = 0; i < 5; i++) {
    const problem = generator.generate(2);
    console.log(`Q${i + 1}: ${problem.num1} ${problem.operator} ${problem.num2} = ${problem.answer}`);
}

console.log('\n--- Level 3 Test (3-digit with carry/borrow) ---');
generator.reset();
for (let i = 0; i < 5; i++) {
    const problem = generator.generate(3);
    console.log(`Q${i + 1}: ${problem.num1} ${problem.operator} ${problem.num2} = ${problem.answer} [${problem.subType}]`);
}
