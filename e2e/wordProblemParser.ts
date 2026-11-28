/**
 * Pure word-problem answer parser for WordProblemView: given the raw story <p> text,
 * extracts the first two embedded numbers and infers the operation from EN/HE phrasing
 * keywords (wordProblemTemplates.ts), since the rendered text carries no i18n key.
 * Exported (Playwright-free: string in, number out) so it can be exercised directly
 * against every WORD_PROBLEM_TEMPLATES entry in both en.json and he.json without
 * driving a real page.
 */
export function parseWordProblemAnswer(text: string): number | null {
  const storyNumbers = text.match(/\d+/g)?.map(Number) || [];
  if (storyNumbers.length < 2) return null;
  const n1 = storyNumbers[0]!;
  const n2 = storyNumbers[1]!;
  if (/will\s+each\b[\s\S]*\bget\b/i.test(text) || /יקבל\s+כל/.test(text)) {
    return n2 === 0 ? null : Math.floor(n1 / n2);
  }
  if (/\beach\s+\S+\s+has\b/i.test(text) || /בכל\s+\S+\s+יש/.test(text)) {
    return n1 * n2;
  }
  if (
    /\bleft\b|\bchange\b|\bmore\s+does\b|\bprofit\s+or\s+loss\b|\bdid\s+you\s+leave\b|\bdid\s+it\s+take\b/i.test(text) ||
    /נשארו|עודף|יותר עולה|יצאת|הפסדת|לקח\?/.test(text)
  ) {
    return n1 - n2;
  }
  return n1 + n2;
}
