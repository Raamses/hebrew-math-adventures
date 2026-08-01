import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NumberInput } from "./NumberInput";
import { WORD_PROBLEM_TEMPLATES } from "../../data/wordProblemTemplates";
import type { Problem } from "../../lib/gameLogic";

interface WordProblemViewProps {
    problem: Problem;
    answer: string;
    setAnswer: (val: string) => void;
    isProcessing?: boolean;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Find the emoji scene for a given word problem by matching its questionKey
 * against the registered templates.
 */
function findEmojiForProblem(questionKey: string): string {
    const template = WORD_PROBLEM_TEMPLATES.find((t) => t.i18nKey === questionKey);
    return template?.emoji ?? "📖✨";
}

export const WordProblemView = React.memo(function WordProblemView({
    problem,
    answer,
    setAnswer,
    isProcessing,
    onKeyDown,
}: WordProblemViewProps) {
    const { t } = useTranslation();

    if (problem.type !== "word") return null;

    const emojiScene = findEmojiForProblem(problem.questionKey);

    return (
        <div className="flex flex-col items-center w-full max-w-lg mb-8 gap-4">
            {/* Emoji scene illustration */}
            <motion.div
                className="text-4xl sm:text-5xl text-center select-none"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                aria-hidden="true"
            >
                {emojiScene}
            </motion.div>

            {/* Story text */}
            <p className="text-xl sm:text-2xl text-slate-700 font-medium text-center mb-2 leading-relaxed">
                {t(problem.questionKey, problem.params)}
            </p>

            {/* Answer input */}
            <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-400">=</span>
                <NumberInput
                    value={answer}
                    onChange={setAnswer}
                    disabled={isProcessing}
                    autoFocus
                    onKeyDown={onKeyDown}
                />
            </div>
        </div>
    );
});