/**
 * Pure formatter for the blitz hero equation display.
 *
 * The producer (src/engines/bubble/strategies/MathStrategy.ts) emits two shapes:
 *   - unknown as the RESULT:  "12 + 7 = ?"
 *   - unknown as an OPERAND:  "? + 5 = 12" | "7 + ? = 12" | "12 - ? = 7"
 *
 * Display rules (review round-3 F3.1, binding review 2026-10-15):
 *   - result-unknown: the hero ends at "=" - strip the trailing "?".
 *   - operand-unknown: leave the equation untouched - the "?" IS the question.
 */
export function blitzEquationDisplay(raw: string): string {
    const equation = (raw ?? '').trim();
    if (!equation) return '';
    return equation.replace(/\s*\?$/u, '').trimEnd();
}
