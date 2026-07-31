export interface SessionRecord {
    date: string;         // YYYY-MM-DD
    durationSec: number;
    correct: number;
    attempts: number;
    skillFocus: string;
    gameMode: string;    // 'bubble' | 'practice' | 'memory' | 'invaders' | 'story'
}