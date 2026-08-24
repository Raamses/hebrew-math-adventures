export type LessonType = 'dialog' | 'interactive_drag' | 'interactive_tap';
export type MascotEmotion = 'idle' | 'happy' | 'thinking' | 'excited' | 'encourage';

/** Visual world a lesson is set in. Drives the scene background + palette. */
export type LessonTheme = 'beach' | 'forest' | 'mountain' | 'desert' | 'space';

/**
 * Every sprite the story scene knows how to draw.
 * 'apple' | 'basket' | 'number' are the original set and are kept so the
 * legacy multiplication lesson keeps rendering unchanged.
 */
export type LessonItemType =
    | 'apple'
    | 'basket'
    | 'number'
    | 'seashell'
    | 'crystal'
    | 'date'
    | 'bunny'
    | 'tree'
    | 'ten_frame'
    | 'desert_animal' | 'star';

/** How a drop zone is drawn. Defaults to 'basket' for backwards compatibility. */
export type LessonTargetVisual = 'basket' | 'ten_frame' | 'crystal_row' | 'animal_plate';

/** Which animal a 'desert_animal' sprite / 'animal_plate' target shows. */
export type DesertAnimal = 'camel' | 'fox' | 'lizard';

/** What tapping an item does during an `interactive_tap` step. */
export type LessonTapAction = 'remove' | 'select' | 'none';

export interface Position {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
}

export interface LessonItem {
    id: string;
    type: LessonItemType;
    position: Position;
    value?: number; // for validation / rendered inside 'number' sprites

    // --- Authoring options ---
    /** i18n key rendered under the sprite (e.g. an animal's name). */
    label?: string;
    /** Which animal to draw for `type: 'desert_animal'`. Defaults to 'camel'. */
    animal?: DesertAnimal;
    /** Sprite scale multiplier (1 = the default 64px sprite box). */
    scale?: number;
    /** false → pure scenery: never draggable, never tappable, ignored by hit-testing. */
    interactive?: boolean;
    /** Behaviour on tap during an `interactive_tap` step. Defaults to 'remove'. */
    tapAction?: LessonTapAction;

    // --- Runtime state (written by LessonEngine, never authored) ---
    /** Set once a 'remove' tap consumes the item; the scene animates it out. */
    removed?: boolean;
    /** Set by a 'select' tap. */
    selected?: boolean;
    /** Id of the target this item was dropped into; placed items can't be re-dragged. */
    placedIn?: string | null;
}

export interface LessonTarget {
    id: string;
    position: Position;
    capacity: number;
    currentCount: number;
    accepts: string[]; // item types

    // --- Authoring options ---
    /** Drop-zone artwork. Defaults to 'basket'. */
    visual?: LessonTargetVisual;
    /** i18n key rendered under the target. */
    label?: string;
    /** Which animal to draw for `visual: 'animal_plate'`. Defaults to 'camel'. */
    animal?: DesertAnimal;
    /**
     * Slots per row. Drives both the drawn grid and where dropped items snap.
     * Defaults to `min(capacity, 5)` — i.e. a real ten-frame is `capacity: 10, columns: 5`.
     */
    columns?: number;
    /** Hide the "n / capacity" badge (frames already show progress via their slots). */
    hideCounter?: boolean;
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

    /** Optional i18n key with a gentler re-phrasing of the task, shown in the footer. */
    hint?: string;
    /** Per-step theme override; falls back to the lesson's theme. */
    theme?: LessonTheme;
    /**
     * Max number of items an `interactive_tap` step may consume. Taps past the
     * goal are refused (and recorded as mistakes) so a child can never tap the
     * step into an unsolvable state.
     */
    tapGoal?: number;

    // Logic
    validationCriteria?: (items: LessonItem[], targets: LessonTarget[]) => boolean;
    onStart?: () => void;
}

export interface LessonDefinition {
    id: string;
    title: string;
    steps: LessonStep[];
    /** Scene theme for every step that doesn't override it. Defaults to 'mountain'. */
    theme?: LessonTheme;
    /** The operation this lesson teaches — used for analytics segmentation. */
    operation?: 'addition' | 'subtraction' | 'multiplication' | 'division';
}

/** Items a child still has to work with: everything not consumed by a tap. */
export const activeItems = (items: LessonItem[]): LessonItem[] => items.filter(i => !i.removed);
