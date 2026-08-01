import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MathText } from '../MathText';

describe('MathText', () => {
    it('renders children correctly', () => {
        const { container } = render(<MathText>3 + 5 = 8</MathText>);
        expect(container.textContent).toBe('3 + 5 = 8');
    });

    it('sets dir="ltr" on the span', () => {
        const { container } = render(<MathText>42</MathText>);
        const span = container.querySelector('span');
        expect(span).not.toBeNull();
        expect(span!.getAttribute('dir')).toBe('ltr');
    });

    it('sets unicodeBidi: isolate style', () => {
        const { container } = render(<MathText>7 × 6 = 42</MathText>);
        const span = container.querySelector('span');
        expect(span).not.toBeNull();
        expect(span!.style.unicodeBidi).toBe('isolate');
    });

    it('applies className when provided', () => {
        const { container } = render(<MathText className="text-lg font-bold">99</MathText>);
        const span = container.querySelector('span');
        expect(span).not.toBeNull();
        expect(span!.className).toContain('text-lg');
        expect(span!.className).toContain('font-bold');
    });

    it('works without className', () => {
        const { container } = render(<MathText>1 + 1</MathText>);
        const span = container.querySelector('span');
        expect(span).not.toBeNull();
        expect(span!.getAttribute('dir')).toBe('ltr');
        expect(span!.style.unicodeBidi).toBe('isolate');
    });
});