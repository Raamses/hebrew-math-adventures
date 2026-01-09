import { motion } from "framer-motion";
import { NumberInput } from "./NumberInput";
import type { Problem } from "../../lib/gameLogic";

interface ArithmeticViewProps {
    problem: Problem;
    answer: string;
    setAnswer: (val: string) => void;
    isProcessing?: boolean;
    wrongAttempts: number;
}

export function ArithmeticView({
    problem,
    answer,
    setAnswer,
    isProcessing,
    wrongAttempts,
}: ArithmeticViewProps) {
    if (problem.type !== "arithmetic") return null;

    const renderNum1 = () => {
        if (problem.missing === "num1") {
            return (
                <NumberInput
                    value={answer}
                    onChange={setAnswer}
                    disabled={isProcessing}
                    autoFocus
                />
            );
        }

        // Hint Logic for borrowing
        const showHint =
            problem.subType === "borrow" &&
            wrongAttempts >= 2 &&
            problem.missing === "answer";

        if (showHint && typeof problem.num1 === "number") {
            const tens = Math.floor(problem.num1 / 10) % 10;
            const ones = problem.num1 % 10;
            const hundreds = Math.floor(problem.num1 / 100);

            return (
                <div className="relative flex items-center tracking-widest">
                    {hundreds > 0 && <span>{hundreds}</span>}
                    <div className="relative mx-1">
                        <span className="relative">
                            {tens}
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                className="absolute top-1/2 left-0 w-full h-1 bg-red-500 origin-left"
                            />
                        </span>
                        <motion.span
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: -20 }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 text-sm text-red-500 font-bold"
                        >
                            {tens - 1}
                        </motion.span>
                    </div>
                    <div className="relative">
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: -8 }}
                            className="absolute top-0 left-0 text-sm text-red-500 font-bold"
                        >
                            1
                        </motion.span>
                        {ones}
                    </div>
                </div>
            );
        }

        return <span className="tracking-widest">{problem.num1}</span>;
    };

    const operatorSymbol =
        problem.operator === "*"
            ? "×"
            : problem.operator === "/"
                ? "÷"
                : problem.operator;

    return (
        <div
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-3xl sm:text-5xl font-bold text-slate-800 mb-6"
            dir="ltr"
            style={{ direction: "ltr" }}
        >
            {renderNum1()}
            <span className="text-primary mx-1">{operatorSymbol}</span>

            {problem.missing === "num2" ? (
                <NumberInput
                    value={answer}
                    onChange={setAnswer}
                    disabled={isProcessing}
                    autoFocus
                />
            ) : (
                <span className="tracking-widest">{problem.num2}</span>
            )}

            <span className="mx-1">=</span>

            {problem.missing === "answer" ? (
                <NumberInput
                    value={answer}
                    onChange={setAnswer}
                    disabled={isProcessing}
                    autoFocus
                />
            ) : (
                <span className="tracking-widest">{problem.answer}</span>
            )}
        </div>
    );
}
