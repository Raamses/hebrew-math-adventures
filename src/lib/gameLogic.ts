export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Problem {
    num1: number;
    num2: number;
    operator: '+' | '-' | '*' | '/';
    answer: number;
    missing: 'answer' | 'num1' | 'num2'; // For "5 + ? = 8"
    subType?: 'borrow' | 'carry' | 'simple' | 'zero'; // For UI hints
}

export const HEBREW_PHRASES = [
    "!אלופה",
    "!גאון של אמא",
    "!מדהים",
    "!כל הכבוד",
    "!איזה יופי",
    "!חכם מאוד",
    "!מצוין",
    "!נהדר",
    "!וואו",
    "!את/ה כוכב/ת",
    "!תשובה נכונה",
    "!המשך כך",
    "!גאווה",
    "!אלוף המספרים",
    "!ישר כוח",
    "!פשוט קסם",
    "!עבודה טובה",
    "!הצלחה מסחררת",
    "!אין עליך",
    "!מלך/מלכת החשבון"
];

export const generateProblem = (streak: number): Problem => {
    let difficulty: Difficulty = 'easy';
    if (streak > 10) difficulty = 'hard';
    else if (streak > 5) difficulty = 'medium';

    let num1, num2, answer;
    let operator: '+' | '-' = Math.random() > 0.5 ? '+' : '-';

    if (difficulty === 'easy') {
        // Sum up to 10
        if (operator === '+') {
            num1 = Math.floor(Math.random() * 6); // 0-5
            num2 = Math.floor(Math.random() * (10 - num1 + 1));
            answer = num1 + num2;
        } else {
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * (num1 + 1));
            answer = num1 - num2;
        }
    } else if (difficulty === 'medium') {
        // Sum up to 15, maybe missing number
        if (operator === '+') {
            num1 = Math.floor(Math.random() * 10);
            num2 = Math.floor(Math.random() * (15 - num1 + 1));
            answer = num1 + num2;
        } else {
            num1 = Math.floor(Math.random() * 15) + 1;
            num2 = Math.floor(Math.random() * (num1 + 1));
            answer = num1 - num2;
        }
    } else {
        // Hard: Sum up to 20
        if (operator === '+') {
            num1 = Math.floor(Math.random() * 15);
            num2 = Math.floor(Math.random() * (20 - num1 + 1));
            answer = num1 + num2;
        } else {
            num1 = Math.floor(Math.random() * 20) + 1;
            num2 = Math.floor(Math.random() * (num1 + 1));
            answer = num1 - num2;
        }
    }

    // Determine missing part based on difficulty/streak
    let missing: 'answer' | 'num1' | 'num2' = 'answer';
    if (difficulty !== 'easy' && Math.random() > 0.6) {
        missing = Math.random() > 0.5 ? 'num1' : 'num2';
    }

    return { num1, num2, operator, answer, missing };
};

export const getRandomPhrase = () => {
    return HEBREW_PHRASES[Math.floor(Math.random() * HEBREW_PHRASES.length)];
};
