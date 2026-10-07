/**
 * Shared blitz question evaluator — parse + evaluate a BlitzQuestion display
 * string exactly the way the engine computes answers.
 *
 * Single source of truth for BOTH suites:
 * - e2e/parent-games.spec.ts imports it directly to compute submitted answers
 *   in the Blitz E2E flow. The ENGINE itself (blitzEngine.ts) is NOT imported
 *   there on purpose: the E2E asserts against the DEPLOYED site, which can
 *   lag the branch — the evaluator travels WITH the spec, and the parity test
 *   below pins it to current engine behaviour at unit-test time, so engine
 *   drift fails CI instead of surfacing as an e2e/production mismatch.
 * - src/components/parent/games/__tests__/ParentBlitz.test.tsx recomputes
 *   answers in unit tests (its former local `evalExpr` moved here).
 *
 * Parity test: src/components/parent/games/__tests__/blitzEval.parity.test.ts
 * proves this parser agrees with blitzEngine.generateQuestion over all 5
 * question types × 3 difficulties — any engine shape this parser misses
 * fails a unit test instead of surfacing as an e2e nightly flake.
 */

/** Vulgar fraction glyphs → (num, den). Single copy for both suites;
 *  the parity test keeps it in lockstep with the engine's glyph map. */
export const VULGAR_FRACTIONS: Readonly<Record<string, [number, number]>> = {
  '¼': [1, 4], '½': [1, 2], '¾': [3, 4],
  '⅓': [1, 3], '⅔': [2, 3],
  '⅕': [1, 5], '⅖': [2, 5], '⅗': [3, 5], '⅘': [4, 5],
  '⅙': [1, 6], '⅚': [5, 6],
  '⅛': [1, 8], '⅜': [3, 8], '⅝': [5, 8], '⅞': [7, 8],
};

/**
 * Parse a blitz display expression and evaluate it with correct precedence.
 * Returns null for unrecognised shapes — callers must fail loudly on null,
 * never guess. Covers every GENERATED shape (blitzEngine.ts):
 * - percentage (all difficulties): "25% × 40"
 * - fraction (all difficulties): "¾ × 12"
 * - orderOfOperations d1: "a + b × c" / "a − b × c" (multiply first)
 * - orderOfOperations d2 / mixedArithmetic d3: "a + b × c − d" (multiply first)
 * - orderOfOperations d3: "(a + b) × c − d"
 * - mixedArithmetic d1/d2: "a ± b" / "a + b − c" (left-to-right)
 * - doubleDigitMultiply (all difficulties): "a × b"
 * Also accepts any simple binary "a op b" (op = + − × ÷, ÷ floors like JS
 * integer division did historically).
 */
export function evalBlitzExpression(display: string): number | null {
  // Strip bidi isolate marks (ISOLATE-1 / PDI) that may wrap question text.
  const text = display.replace(/\u2068|\u2069/g, '').trim();

  // percentage — "25% × 40" → (pct * base) / 100
  const pct = text.match(/^(\d+)\s*%\s*×\s*(\d+)$/);
  if (pct) return (parseInt(pct[1]) * parseInt(pct[2])) / 100;

  // fraction — "¾ × 12" → (num / den) * n (engine guarantees integer answer)
  for (const [glyph, [num, den]] of Object.entries(VULGAR_FRACTIONS)) {
    const m = text.match(new RegExp(`^${glyph}\\s*×\\s*(\\d+)$`));
    if (m) return (num * parseInt(m[1])) / den;
  }

  // orderOfOperations d3 — "(a + b) × c − d"
  const paren = text.match(/^\((\d+)\s*([+\-−])\s*(\d+)\)\s*×\s*(\d+)\s*([\-−])\s*(\d+)$/);
  if (paren) {
    const sub = paren[2] === '+'
      ? parseInt(paren[1]) + parseInt(paren[3])
      : parseInt(paren[1]) - parseInt(paren[3]);
    return sub * parseInt(paren[4]) - parseInt(paren[6]);
  }

  // orderOfOperations d2 / mixedArithmetic d3 — "a ± b × c − d" (multiply first).
  // Engine only emits '−' before the trailing term, but the group stays
  // symmetric with the tri branch so no future shape silently dead-codes the '+' arm.
  const flat4 = text.match(/^(\d+)\s*([+\-−])\s*(\d+)\s*×\s*(\d+)\s*([+\-−])\s*(\d+)$/);
  if (flat4) {
    const p1 = parseInt(flat4[1]);
    const p3 = parseInt(flat4[3]);
    const p4 = parseInt(flat4[4]);
    const p6 = parseInt(flat4[6]);
    const sub = flat4[2] === '+' ? p1 + p3 * p4 : p1 - p3 * p4;
    return flat4[5] === '+' ? sub + p6 : sub - p6;
  }

  // orderOfOperations d1 — "a ± b × c" (multiply first)
  const flat3 = text.match(/^(\d+)\s*([+\-−])\s*(\d+)\s*×\s*(\d+)$/);
  if (flat3) {
    const p1 = parseInt(flat3[1]);
    const p3 = parseInt(flat3[3]);
    const p4 = parseInt(flat3[4]);
    return flat3[2] === '+' ? p1 + p3 * p4 : p1 - p3 * p4;
  }

  // mixedArithmetic d2 — "a ± b − c" (pure ±, left-to-right)
  const tri = text.match(/^(\d+)\s*([+\-−])\s*(\d+)\s*([+\-−])\s*(\d+)$/);
  if (tri) {
    const step1 = tri[2] === '+'
      ? parseInt(tri[1]) + parseInt(tri[3])
      : parseInt(tri[1]) - parseInt(tri[3]);
    return tri[4] === '+' ? step1 + parseInt(tri[5]) : step1 - parseInt(tri[5]);
  }

  // simple binary + doubleDigitMultiply — "a op b" (op = + − × ÷)
  const bin = text.match(/^(\d+)\s*([+\-−×÷])\s*(\d+)$/);
  if (bin) {
    const a = parseInt(bin[1]);
    const op = bin[2];
    const b = parseInt(bin[3]);
    switch (op) {
      case '+': return a + b;
      case '−': case '-': return a - b;
      case '×': return a * b;
      case '÷': return Math.floor(a / b);
      // Real guard, not a silent fallback: a new operator glyph upstream
      // becomes a loud error here instead of a wrong a + b answer.
      default: throw new Error(`unreached blitz operator: "${op}"`);
    }
  }

  // Unrecognised shape — return null; callers must fail loudly with the raw text.
  return null;
}