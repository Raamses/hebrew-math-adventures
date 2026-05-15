import React, { useRef, useEffect } from "react";
import { cn } from "../../lib/utils";

interface NumberInputProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
    inputMode?: "numeric" | "text" | "tel" | "search" | "email" | "url" | "decimal" | "none";
    "aria-label"?: string;
    maxLength?: number;
}

// ⚡ Bolt: Wrapped in React.memo to prevent unnecessary re-renders when parent states
// (like `answer` in MathCard/ArithmeticView/SeriesView) change, reducing React reconciliation.
export const NumberInput = React.memo(function NumberInput({
    value,
    onChange,
    disabled = false,
    placeholder = "?",
    className,
    autoFocus = false,
    inputMode = "numeric",
    maxLength = 10,
    "aria-label": ariaLabel = "Enter number"
}: NumberInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus && !disabled) {
            // Small timeout to ensure the element is in the DOM and ready
            // especially during rapid transitions or animations
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [autoFocus, disabled]);

    return (
        <input
            ref={inputRef}
            type="number"
            inputMode={inputMode}
            pattern="[0-9]*"
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className={cn(
                "w-16 h-16 sm:w-24 sm:h-24 text-center font-bold text-indigo-600 bg-indigo-50",
                "rounded-2xl border-4 border-indigo-300",
                "focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        />
    );
});
