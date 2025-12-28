export type LessonType = 'dialog' | 'interactive_drag' | 'interactive_tap';
export type MascotEmotion = 'idle' | 'happy' | 'thinking' | 'excited' | 'encourage';

export interface Position {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
}

export interface LessonItem {
    id: string;
    type: 'apple' | 'basket' | 'number';
    position: Position;
    value?: number; // for validation
}

export interface LessonTarget {
    id: string;
    position: Position;
    capacity: number;
    currentCount: number;
    accepts: string[]; // item types
}

export interface LessonStep {
    id: string;
    type: LessonType;

    // Mascot
    mascotText: string;
    mascotEmotion: MascotEmotion;

    // Interactive Content
    items: LessonItem[];
    targets: LessonTarget[];
    showEquation?: string;

    // Logic
    validationCriteria?: (items: LessonItem[], targets: LessonTarget[]) => boolean;
    onStart?: () => void;
}

export interface LessonDefinition {
    id: string;
    title: string;
    steps: LessonStep[];
}
