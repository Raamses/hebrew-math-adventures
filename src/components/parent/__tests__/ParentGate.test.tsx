import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParentGate } from '../ParentGate';

describe('ParentGate', () => {
  /* ── 1. Mascot handover frame & in-world copy ──────────────────── */
  describe('mascot handover frame and in-world copy', () => {
    it('renders with the default active mascot (bear) and in-world copy', () => {
      render(<ParentGate onSuccess={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByTestId('parent-gate-mascot-frame')).toBeInTheDocument();
      expect(screen.getByTestId('parent-gate-clipboard')).toBeInTheDocument();
      expect(
        screen.getByText('רגע של גדולים — עזרו לדב לפתוח את השער')
      ).toBeInTheDocument();
    });

    it('adapts in-world copy when active mascot is owl', () => {
      render(
        <ParentGate
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
          activeMascot="owl"
        />
      );

      expect(
        screen.getByText('רגע של גדולים — עזרו לינשוף לפתוח את השער')
      ).toBeInTheDocument();
    });

    it('adapts in-world copy when active mascot is ant', () => {
      render(
        <ParentGate
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
          activeMascot="ant"
        />
      );

      expect(
        screen.getByText('רגע של גדולים — עזרו לנמלה לפתוח את השער')
      ).toBeInTheDocument();
    });

    it('adapts in-world copy when active mascot is lion', () => {
      render(
        <ParentGate
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
          activeMascot="lion"
        />
      );

      expect(
        screen.getByText('רגע של גדולים — עזרו לאריה לפתוח את השער')
      ).toBeInTheDocument();
    });

    it('renders the arithmetic challenge problem inside the clipboard', () => {
      render(<ParentGate onSuccess={vi.fn()} onCancel={vi.fn()} />);

      const problemEl = screen.getByTestId('parent-gate-problem');
      expect(problemEl).toBeInTheDocument();
      expect(problemEl.textContent).toMatch(/\d+\s*\+\s*\d+\s*=\s*\?/);
    });
  });

  /* ── 2. Keypad validates correct answer -> onSuccess fires ─────── */
  describe('keypad and validation', () => {
    it('validates the correct answer via keypad and fires onSuccess', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onCancel = vi.fn();

      render(<ParentGate onSuccess={onSuccess} onCancel={onCancel} />);

      // Parse the problem from the clipboard DOM
      const problemText = screen.getByTestId('parent-gate-problem').textContent || '';
      const match = problemText.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
      expect(match).not.toBeNull();

      const n1 = parseInt(match![1], 10);
      const n2 = parseInt(match![2], 10);
      const sumStr = String(n1 + n2);

      // Type the answer using the keypad
      for (const digit of sumStr) {
        await user.click(screen.getByTestId(`parent-gate-key-${digit}`));
      }

      // Check input reflects keypad typing
      const input = screen.getByTestId('parent-gate-input') as HTMLInputElement;
      expect(input.value).toBe(sumStr);

      // Click submit key
      await user.click(screen.getByTestId('parent-gate-key-submit'));

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('removes digits using the backspace key', async () => {
      const user = userEvent.setup();
      render(<ParentGate onSuccess={vi.fn()} onCancel={vi.fn()} />);

      const input = screen.getByTestId('parent-gate-input') as HTMLInputElement;

      await user.click(screen.getByTestId('parent-gate-key-5'));
      await user.click(screen.getByTestId('parent-gate-key-9'));
      expect(input.value).toBe('59');

      await user.click(screen.getByTestId('parent-gate-key-backspace'));
      expect(input.value).toBe('5');
    });

    it('limits input to 3 digits', async () => {
      const user = userEvent.setup();
      render(<ParentGate onSuccess={vi.fn()} onCancel={vi.fn()} />);

      const input = screen.getByTestId('parent-gate-input') as HTMLInputElement;

      await user.click(screen.getByTestId('parent-gate-key-1'));
      await user.click(screen.getByTestId('parent-gate-key-2'));
      await user.click(screen.getByTestId('parent-gate-key-3'));
      await user.click(screen.getByTestId('parent-gate-key-4'));

      expect(input.value).toBe('123');
    });
  });

  /* ── 3. Kid-bypass: 2 failed attempts -> smooth return ─────────── */
  describe('kid-bypass behavior', () => {
    it('fires the smooth-return callback after 2 failed attempts with no error UI', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onCancel = vi.fn();

      render(<ParentGate onSuccess={onSuccess} onCancel={onCancel} />);

      // Attempt 1: submit incorrect answer
      await user.click(screen.getByTestId('parent-gate-key-1'));
      await user.click(screen.getByTestId('parent-gate-key-submit'));

      // Should not cancel yet after 1st attempt
      expect(onCancel).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();

      // Gentle mascot line should appear instead of error sounds/penalties
      expect(
        screen.getByText('לא נורא, בוא ננסה שאלה אחרת!')
      ).toBeInTheDocument();

      // Ensure no error UI (no red border / error alert)
      const input = screen.getByTestId('parent-gate-input');
      expect(input.className).not.toContain('border-red-500');
      expect(input.className).not.toContain('bg-red-50');

      // Attempt 2: submit incorrect answer again
      await user.click(screen.getByTestId('parent-gate-key-2'));
      await user.click(screen.getByTestId('parent-gate-key-submit'));

      // Smooth-return callback fires on 2nd failed attempt
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('uses onClose callback if provided when 2 failed attempts occur', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onCancel = vi.fn();
      const onClose = vi.fn();

      render(
        <ParentGate
          onSuccess={onSuccess}
          onCancel={onCancel}
          onClose={onClose}
        />
      );

      // Attempt 1
      await user.click(screen.getByTestId('parent-gate-key-1'));
      await user.click(screen.getByTestId('parent-gate-key-submit'));
      expect(onClose).not.toHaveBeenCalled();

      // Attempt 2
      await user.click(screen.getByTestId('parent-gate-key-2'));
      await user.click(screen.getByTestId('parent-gate-key-submit'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  /* ── 4. Entry points and origin friction hint ──────────────────── */
  describe('entry points and origin handling', () => {
    it('renders the subtle friction hint for map origin', () => {
      render(
        <ParentGate
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
          origin="map"
        />
      );

      const hint = screen.getByTestId('parent-gate-friction-hint');
      expect(hint).toBeInTheDocument();
      expect(hint).toHaveTextContent('כניסה מאובטחת');
    });

    it('does not render the friction hint for select origin', () => {
      render(
        <ParentGate
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
          origin="select"
        />
      );

      expect(
        screen.queryByTestId('parent-gate-friction-hint')
      ).not.toBeInTheDocument();
    });

    it('does not render the friction hint by default (no origin specified)', () => {
      render(<ParentGate onSuccess={vi.fn()} onCancel={vi.fn()} />);

      expect(
        screen.queryByTestId('parent-gate-friction-hint')
      ).not.toBeInTheDocument();
    });
  });

  /* ── 5. Action buttons & mobile-first RTL ───────────────────────── */
  describe('buttons and layout', () => {
    it('calls onCancel when the cancel (X) button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<ParentGate onSuccess={vi.fn()} onCancel={onCancel} />);

      await user.click(screen.getByTestId('parent-gate-cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('generates a new problem and clears answer on "שאלה אחרת" click', async () => {
      const user = userEvent.setup();
      render(<ParentGate onSuccess={vi.fn()} onCancel={vi.fn()} />);

      const input = screen.getByTestId('parent-gate-input') as HTMLInputElement;
      await user.click(screen.getByTestId('parent-gate-key-8'));
      expect(input.value).toBe('8');

      const problemBefore = screen.getByTestId('parent-gate-problem').textContent;

      // Click "שאלה אחרת" button
      const anotherBtn = screen.getByTestId('parent-gate-another-problem');
      expect(anotherBtn).toHaveTextContent('שאלה אחרת');
      await user.click(anotherBtn);

      // Input should be cleared
      expect(input.value).toBe('');

      // Problem should remain valid arithmetic
      const problemAfter = screen.getByTestId('parent-gate-problem').textContent;
      expect(problemAfter).toMatch(/\d+\s*\+\s*\d+\s*=\s*\?/);
    });

    it('has RTL direction on the parent gate modal', () => {
      render(<ParentGate onSuccess={vi.fn()} onCancel={vi.fn()} />);

      const gate = screen.getByTestId('parent-gate');
      expect(gate).toHaveAttribute('dir', 'rtl');
    });

    it('renders with 56px thumb-friendly keypad keys', () => {
      render(<ParentGate onSuccess={vi.fn()} onCancel={vi.fn()} />);

      const key1 = screen.getByTestId('parent-gate-key-1');
      expect(key1.className).toContain('h-14');
      expect(key1.className).toContain('min-h-[56px]');

      const submitKey = screen.getByTestId('parent-gate-key-submit');
      expect(submitKey.className).toContain('h-14');
      expect(submitKey.className).toContain('min-h-[56px]');
    });
  });
});
