import { useTranslation } from "react-i18next";
import { NumberInput } from "./NumberInput";
import type { Problem } from "../../lib/gameLogic";

interface WordProblemViewProps {
    problem: Problem;
    answer: string;
    setAnswer: (val: string) => void;
    isProcessing?: boolean;
}

export function WordProblemView({
    problem,
    answer,
    setAnswer,
    isProcessing,
}: WordProblemViewProps) {
    const { t } = useTranslation();

    if (problem.type !== "word") return null;

    return (
        <div className="flex flex-col items-center w-full max-w-lg mb-8">
            <p className="text-xl sm:text-2xl text-slate-700 font-medium text-center mb-6 leading-relaxed">
                {t(problem.questionKey, problem.params)}
            </p>
            <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-400">=</span>
                <NumberInput
                    value={answer}
                    onChange={setAnswer}
                    disabled={isProcessing}
                    autoFocus
                />
            </div>
        </div>
    );
}
