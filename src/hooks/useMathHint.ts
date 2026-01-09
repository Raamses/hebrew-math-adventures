import { useState, useMemo } from 'react';

export function useMathHint(operand1: number, operand2: number, operator: string) {
    const [step, setStep] = useState(0);

    const num1Digits = operand1.toString().padStart(3, '0').split('').map(Number);
    const num2Digits = operand2.toString().padStart(3, '0').split('').map(Number);
    const isAddition = operator === '+';

    const { focusIndex, isBorrowOrCarry } = useMemo(() => {
        // Evaluate from right (Ones) to left
        for (let i = 2; i >= 0; i--) {
            if (isAddition) {
                if (num1Digits[i] + num2Digits[i] >= 10) return { focusIndex: i, isBorrowOrCarry: true };
            } else {
                if (num1Digits[i] < num2Digits[i]) return { focusIndex: i, isBorrowOrCarry: true };
            }
        }
        // Default to Ones column if no simple borrow/carry found
        return {
            focusIndex: 2,
            isBorrowOrCarry: false
        };
    }, [num1Digits, num2Digits, isAddition]);

    const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

    return {
        step,
        setStep,
        nextStep,
        prevStep,
        num1Digits,
        num2Digits,
        isAddition,
        focusIndex,
        isBorrowOrCarry
    };
}
