/**
 * Figures for the shape-pattern picture puzzles: a shape with a colour, size, rotation and count.
 * Rendered as SVG (components/PrepFigure.tsx); the option text is the figure's canonical Hebrew label,
 * which doubles as its accessible name and as the equivalence key (two options never look the same).
 */

export const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'arrow'] as const;
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
}

/** A stem layout: a row (series, odd one out) or a 3×3 grid; `null` is the missing "?" cell. */
export interface FigureBoard {
    readonly layout: 'row' | 'grid';
    readonly cells: readonly (Figure | null)[];
}

/**
 * Only the arrow and the triangle show which way they point: every quarter turn of them looks different.
 * A circle or square looks the same at every quarter turn, and the star and heart are only ever drawn upright,
 * so their rotation is not part of what the child sees.
 */
export const POINTING: readonly Shape[] = ['arrow', 'triangle'];

/** The figure as the child sees it: rotation dropped for shapes that do not point. */
export const canon = (f: Figure): Figure => ({ ...f, rot: POINTING.includes(f.shape) ? f.rot : 0 });

const SHAPE_HE: Readonly<Record<Shape, readonly [string, string]>> = {
    circle: ['עיגול', 'עיגולים'], square: ['ריבוע', 'ריבועים'], triangle: ['משולש', 'משולשים'],
    star: ['כוכב', 'כוכבים'], heart: ['לב', 'לבבות'], arrow: ['חץ', 'חצים'],
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

/** "משולש כחול גדול שמצביע ימינה" / "3 עיגולים אדומים קטנים": every attribute that can be seen. */
export function label(fig: Figure): string {
    const f = canon(fig);
    const many = f.count > 1;
    const base = `${many ? `${f.count} ` : ''}${shapeName(f.shape, many)} ${colorName(f.color, many)} ${sizeName(f.size, many)}`;
    return POINTING.includes(f.shape) ? `${base} ${many ? 'שמצביעים' : 'שמצביע'} ${dirName(f.rot)}` : base;
}

