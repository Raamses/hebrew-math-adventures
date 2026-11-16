/**
 * Figures for the shape-pattern picture puzzles: a shape with a colour, size, rotation and count.
 * Rendered as SVG (components/PrepFigure.tsx); the option text is the figure's canonical Hebrew label,
 * which doubles as its accessible name and as the equivalence key (two options never look the same).
 */

export const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'arrow', 'flag'] as const;
export const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'] as const;
export type Shape = typeof SHAPES[number];
export type FigColor = typeof COLORS[number];
export type Size = 1 | 2 | 3;
export type Rotation = 0 | 90 | 180 | 270;

export interface Figure {
    readonly shape: Shape;
    readonly color: FigColor;
    readonly size: Size;
    /** Clockwise degrees; 0 = pointing up. Only meaningful for shapes that point (see POINTING). */
    readonly rot: Rotation;
    readonly count: number;
    /**
     * Mirrored left-right before the rotation (drawn as rotate(rot) of the mirror image). Only the flag looks
     * different in a mirror; every other shape here is symmetric about its own up-down axis.
     */
    readonly flip?: boolean;
}

/**
 * A stem layout: a row (series, odd one out), a 3×3 grid, or an analogy (cells A, B, C, null read as
 * "A is to B as C is to ?"); `null` is the missing "?" cell.
 */
export interface FigureBoard {
    readonly layout: 'row' | 'grid' | 'analogy';
    readonly cells: readonly (Figure | null)[];
}

/**
 * Only the arrow, the triangle and the flag show which way they point: every quarter turn of them looks different.
 * A circle or square looks the same at every quarter turn, and the star and heart are only ever drawn upright,
 * so their rotation is not part of what the child sees. Of these, only the flag (cloth on one side of the pole)
 * changes in a mirror; the others are their own mirror image (proved on the drawn vertices in figureSymmetry.test).
 */
export const POINTING: readonly Shape[] = ['arrow', 'triangle', 'flag'];
const CHIRAL: readonly Shape[] = ['flag'];

/** The figure as the child sees it: rotation dropped for shapes that do not point, the mirror for shapes it cannot change. */
export function canon(f: Figure): Figure {
    const { flip, ...rest } = f;
    return { ...rest, rot: POINTING.includes(f.shape) ? f.rot : 0, ...(flip && CHIRAL.includes(f.shape) ? { flip: true } : {}) };
}

const SHAPE_HE: Readonly<Record<Shape, readonly [string, string]>> = {
    circle: ['עיגול', 'עיגולים'], square: ['ריבוע', 'ריבועים'], triangle: ['משולש', 'משולשים'],
    star: ['כוכב', 'כוכבים'], heart: ['לב', 'לבבות'], arrow: ['חץ', 'חצים'], flag: ['דגל', 'דגלים'],
};
const COLOR_HE: Readonly<Record<FigColor, readonly [string, string]>> = {
    red: ['אדום', 'אדומים'], blue: ['כחול', 'כחולים'], green: ['ירוק', 'ירוקים'],
    yellow: ['צהוב', 'צהובים'], purple: ['סגול', 'סגולים'],
};
const SIZE_HE: Readonly<Record<Size, readonly [string, string]>> = {
    1: ['קטן', 'קטנים'], 2: ['בינוני', 'בינוניים'], 3: ['גדול', 'גדולים'],
};
const DIR_HE: Readonly<Record<Rotation, string>> = { 0: 'למעלה', 90: 'ימינה', 180: 'למטה', 270: 'שמאלה' };

export const shapeName = (s: Shape, plural = false) => SHAPE_HE[s][plural ? 1 : 0];
export const colorName = (c: FigColor, plural = false) => COLOR_HE[c][plural ? 1 : 0];
export const sizeName = (s: Size, plural = false) => SIZE_HE[s][plural ? 1 : 0];
export const dirName = (r: Rotation) => DIR_HE[r];

/** The side the flag's cloth hangs on: a quarter turn clockwise from where the pole points, or anticlockwise if mirrored. */
export const clothSide = (f: Figure): Rotation => (((f.rot + (f.flip ? 270 : 90)) % 360) as Rotation);

/**
 * "משולש כחול גדול שמצביע ימינה" / "3 עיגולים אדומים קטנים" / "דגל ירוק בינוני שמצביע למעלה והבד ימינה":
 * every attribute that can be seen, so two figures have the same label exactly when they look the same.
 */
export function label(fig: Figure): string {
    const f = canon(fig);
    const many = f.count > 1;
    const base = `${many ? `${f.count} ` : ''}${shapeName(f.shape, many)} ${colorName(f.color, many)} ${sizeName(f.size, many)}`;
    if (!POINTING.includes(f.shape)) return base;
    const points = `${base} ${many ? 'שמצביעים' : 'שמצביע'} ${dirName(f.rot)}`;
    return CHIRAL.includes(f.shape) ? `${points} והבד ${dirName(clothSide(f))}` : points;
}

