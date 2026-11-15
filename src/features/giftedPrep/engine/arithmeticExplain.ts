/**
 * Kid-language Hebrew explanations for procedural arithmetic.
 * Every equation inside a Hebrew sentence is wrapped in LRI…PDI (U+2066/U+2069), the inline form of
 * vault/rules/rtl-hebrew.md's dir="ltr" rule: without it RTL bidi shows "45 − 20 = 25" as "25 = 20 − 45".
 */

export const ltr = (s: string) => `⁦${s}⁩`;

const tens = (n: number) => Math.floor(n / 10) * 10;
const ones = (n: number) => n % 10;

export function addExplanation(a: number, b: number): string {
    const t = tens(a) + tens(b), o = ones(a) + ones(b);
    if (b < 10) {
        if (o === 10) return `מגיעים בדיוק לעשרת השלמה: ${ltr(`${a} + ${b} = ${a + b}`)}.`;
        return o > 10
            ? `מוסיפים ${b} ועוברים את העשרת: ${ltr(`${a} + ${10 - ones(a)} = ${tens(a) + 10}`)}, ועוד ${b - (10 - ones(a))}: ${ltr(`${tens(a) + 10} + ${b - (10 - ones(a))} = ${a + b}`)}.`
            : `מחברים רק את האחדות: ${ltr(`${ones(a)} + ${b} = ${o}`)}, אז ${ltr(`${a} + ${b} = ${a + b}`)}.`;
    }
    if (ones(b) === 0) return `מוסיפים רק עשרות: ${ltr(`${tens(a)} + ${b} = ${tens(a) + b}`)}, ועוד ${ones(a)} אחדות: ${ltr(`${a} + ${b} = ${a + b}`)}.`;
    if (ones(a) === 0) return `מחברים עשרות לעשרות: ${ltr(`${a} + ${tens(b)} = ${a + tens(b)}`)}, ועוד ${ones(b)}: ${ltr(`${a} + ${b} = ${a + b}`)}.`;
    return `מחברים עשרות לעשרות: ${ltr(`${tens(a)} + ${tens(b)} = ${t}`)}. `
        + `ואחדות לאחדות: ${ltr(`${ones(a)} + ${ones(b)} = ${o}`)}. `
        + `ביחד: ${ltr(`${t} + ${o} = ${a + b}`)}.`;
}

export function subExplanation(a: number, b: number): string {
    if (b < 10) {
        if (ones(a) === 0) return `פורטים עשרת אחת: ${ltr(`${a} − ${b} = ${a - b}`)}.`;
        return ones(a) >= b
            ? `מורידים רק מהאחדות: ${ltr(`${ones(a)} − ${b} = ${ones(a) - b}`)}, אז ${ltr(`${a} − ${b} = ${a - b}`)}.`
            : `מורידים קודם ${ones(a)} כדי להגיע ל־${tens(a)}, ואז עוד ${b - ones(a)}: ${ltr(`${tens(a)} − ${b - ones(a)} = ${a - b}`)}.`;
    }
    const mid = a - tens(b);
    if (ones(b) === 0) return `מורידים רק עשרות: ${ltr(`${a} − ${b} = ${a - b}`)}.`;
    return `קודם מורידים את העשרות: ${ltr(`${a} − ${tens(b)} = ${mid}`)}. `
        + `אחר כך את האחדות: ${ltr(`${mid} − ${ones(b)} = ${a - b}`)}.`;
}

export function missingExplanation(a: number, b: number, op: '+' | '-', result: number, hideFirst: boolean): string {
    if (op === '+') {
        const known = hideFirst ? b : a;
        return `כדי למצוא את המספר החסר עושים את הפעולה ההפוכה: ${ltr(`${result} − ${known} = ${result - known}`)}. `
            + `בדיקה: ${ltr(`${a} + ${b} = ${result}`)}.`;
    }
    if (hideFirst) {
        return `המספר החסר גדול מ־${result}, כי הורידו ממנו ${b}. מחברים: ${ltr(`${result} + ${b} = ${a}`)}. `
            + `בדיקה: ${ltr(`${a} − ${b} = ${result}`)}.`;
    }
    return `כמה צריך להוריד מ־${a} כדי להגיע ל־${result}? ${ltr(`${a} − ${result} = ${b}`)}. `
        + `בדיקה: ${ltr(`${a} − ${b} = ${result}`)}.`;
}

export function wordExplanation(n1: number, n2: number, op: '+' | '-', answer: number): string {
    return op === '+'
        ? `בשאלה מוסיפים, אז מחברים: ${ltr(`${n1} + ${n2} = ${answer}`)}.`
        : `בשאלה מורידים או משווים, אז מחסרים: ${ltr(`${n1} − ${n2} = ${answer}`)}.`;
}
