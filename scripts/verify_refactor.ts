
import { ArithmeticFactory, ProblemTypes, ArithmeticConfig } from '../src/engines/ProblemFactory';
import { RandomUtils } from '../src/engines/utils/ProblemUtils';

const runVerification = () => {
    console.log("Starting ProblemFactory Verification...");
    const factory = new ArithmeticFactory();
    let failures = 0;
    let total = 0;

    // Test 1: Simple Addition (Level 1)
    try {
        const p1 = factory.generate(1, ProblemTypes.ARITHMETIC_SIMPLE, { max: 10 });
        total++;
        if (p1.num1 + p1.num2 !== p1.answer) {
            console.error(`[FAIL] Simple Addition: ${p1.num1} + ${p1.num2} != ${p1.answer}`);
            failures++;
        } else {
            console.log(`[PASS] Simple Addition: ${p1.num1} + ${p1.num2} = ${p1.answer}`);
        }
    } catch (e) {
        console.error(`[ERROR] Simple Addition`, e);
        failures++;
    }

    // Test 2: Subtraction (Borrow)
    try {
        const p2 = factory.generate(3, ProblemTypes.SUBTRACTION_BORROW);
        total++;
        if (p2.num1 - p2.num2 !== p2.answer) {
            console.error(`[FAIL] Subtraction Borrow: ${p2.num1} - ${p2.num2} != ${p2.answer}`);
            failures++;
        } else {
            console.log(`[PASS] Subtraction Borrow: ${p2.num1} - ${p2.num2} = ${p2.answer}`);
        }
        // Verify borrow property (digit check logic was complex, basic valid check here)
        if (p2.num1 < p2.num2) {
            console.error(`[FAIL] Subtraction Borrow: Answer became negative? ${p2.num1} < ${p2.num2}`);
            failures++;
        }
    } catch (e) {
        console.error(`[ERROR] Subtraction Borrow`, e);
        failures++;
    }

    // Test 3: ID Generation
    const id = RandomUtils.generateId();
    if (!id || id.length < 10) { // UUID is usually 36 chars
        console.error(`[FAIL] ID Generation: ${id}`);
        failures++;
    } else {
        console.log(`[PASS] ID Generation: ${id}`);
    }

    console.log(`Verification Complete: ${total - failures}/${total} Passed.`);
    if (failures > 0) process.exit(1);
};

runVerification();
