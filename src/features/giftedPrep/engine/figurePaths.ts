import type { Figure, Shape } from './figures';

/**
 * 0–40 viewBox outlines, all pointing up at rotation 0 (components/PrepFigure.tsx draws them). The square,
 * triangle, arrow and flag are straight-edged with absolute commands only, so a test can read their corners
 * and check figures.ts `canon` against the real drawing (__tests__/figureSymmetry.test.ts).
 */
export const PATH: Readonly<Record<Exclude<Shape, 'circle'>, string>> = {
    square: 'M6 6H34V34H6z',
    triangle: 'M20 4L36 34H4z',
    star: 'M20 3l4.9 10.6 11.6 1.3-8.6 7.8 2.4 11.4L20 28.3 9.7 34.1l2.4-11.4-8.6-7.8 11.6-1.3z',
    heart: 'M20 35S4 25 4 14a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 11-16 21-16 21z',
    arrow: 'M20 3L34 18H25V37H15V18H6z',
    // pole on the left, cloth to its right at the top: the one shape that changes in a mirror
    flag: 'M10 4H14V37H10z M14 4L34 12L14 20z',
};

/** Size steps far enough apart to tell small from medium at option size. */
export const SCALE = { 1: 0.48, 2: 0.74, 3: 1 } as const;

/**
 * The SVG transform PrepFigure puts on a figure's outline: scale about the centre, mirrored left-right when
 * `flip` (flag only), then rotated `rot` clockwise. figures.ts `canon` and figureAnalogy.ts `turn` assume this
 * order; figureSymmetry.test evaluates this exact string on the outline corners.
 */
export function figureTransform(fig: Figure): string {
    const s = SCALE[fig.size];
    return `rotate(${fig.rot} 20 20) translate(20 20) scale(${fig.flip ? -s : s} ${s}) translate(-20 -20)`;
}
