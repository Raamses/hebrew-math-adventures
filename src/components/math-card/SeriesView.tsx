import { ArrowRight } from "lucide-react";
import React from "react";
import { NumberInput } from "./NumberInput";
import type { Problem } from "../../lib/gameLogic";

interface SeriesViewProps {
    problem: Problem;
    answer: string;
    setAnswer: (val: string) => void;
    isProcessing?: boolean;
}

export function SeriesView({
    problem,
    answer,
    setAnswer,
    isProcessing,
}: SeriesViewProps) {
    if (problem.type !== "series") return null;

    return (
        <div
            className="flex flex-nowrap items-center justify-start md:justify-center gap-1 sm:gap-2 w-full mb-8 px-1 sm:px-4 overflow-x-auto md:overflow-visible pb-4 md:pb-0 scrollbar-hide snap-x md:snap-none"
            dir="ltr"
        >
            {problem.sequence.map((num, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && (
                        <ArrowRight className="text-slate-300 w-4 h-4 sm:w-8 sm:h-8 flex-shrink-0" />
                    )}
                    <div className="flex-1 aspect-square min-w-0 max-w-[6rem] flex items-center justify-center">
                        {idx === problem.missingIndex ? (
                            <NumberInput
                                value={answer}
                                onChange={setAnswer}
                                disabled={isProcessing}
                                autoFocus
                                className="w-full h-full text-lg sm:text-4xl rounded-lg sm:rounded-2xl border-2 sm:border-4 focus:ring-2 sm:focus:ring-4 p-0 shadow-sm"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg sm:text-4xl font-bold text-slate-700 bg-white rounded-lg sm:rounded-2xl border-2 sm:border-4 border-slate-200 shadow-sm">
                                {num}
                            </div>
                        )}
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}
