import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Problem } from "../../lib/gameLogic";
import { cn } from "../../lib/utils";

interface ComparisonViewProps {
    problem: Problem;
    isProcessing?: boolean;
    onCompare: (symbol: string) => void;
}

export function ComparisonView({
    problem,
    isProcessing,
    onCompare,
}: ComparisonViewProps) {
    const { t } = useTranslation();

    if (problem.type !== "compare") return null;

    return (
        <div className="w-full flex flex-col items-center">
            <div
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-3xl sm:text-5xl font-bold text-slate-800 mb-6"
                dir="ltr"
                style={{ direction: "ltr" }}
            >
                <span className="tracking-widest">{problem.num1}</span>
                <div className="w-12 h-12 sm:w-16 sm:h-16 ml-3 mr-3 bg-indigo-50 rounded-xl border-4 border-dashed border-indigo-300 flex items-center justify-center text-indigo-400">
                    ?
                </div>
                <span className="tracking-widest">{problem.num2}</span>
            </div>
            <div
                className="flex gap-3 sm:gap-4 w-full justify-center"
                dir="ltr"
                style={{ direction: "ltr" }}
            >
                {[">", "=", "<"].map((symbol) => (
                    <motion.button
                        key={symbol}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onCompare(symbol)}
                        className={cn(
                            "w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-600",
                            "text-3xl sm:text-4xl font-bold rounded-2xl border-4 border-slate-300 hover:border-indigo-400",
                            "shadow-sm transition-colors",
                            isProcessing && "opacity-50 cursor-not-allowed"
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={t("game.compareSymbol", { symbol })}
                    >
                        {symbol}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
