import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ParentGamesHub } from './ParentGamesHub';

// The hub is tested for structure and routing, not for translation content, so
// `t` echoes the key back. This keeps the test independent of he.json/en.json.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => 'rtl', language: 'he' },
  }),
}));

describe('ParentGamesHub', () => {
  it('renders the game list with available and coming-soon games', () => {
    render(<ParentGamesHub />);

    expect(screen.getByTestId('games-list')).toBeInTheDocument();

    expect(screen.getByTestId('game-card-equation-of-the-day')).toBeEnabled();
    expect(screen.getByTestId('game-card-parent-blitz')).toBeEnabled();
    expect(screen.getByTestId('game-card-number-merge')).toBeEnabled();
    expect(screen.getByTestId('game-card-math-crossword')).toBeDisabled();

    expect(
      screen.getByText('parent.games.items.equationOfTheDay.title'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('parent.games.soon')).toHaveLength(1);
  });

  it('switches to the playing view when an available game is clicked', async () => {
    const user = userEvent.setup();
    render(<ParentGamesHub />);

    await user.click(screen.getByTestId('game-card-parent-blitz'));

    expect(screen.getByTestId('game-view')).toBeInTheDocument();
    expect(screen.getByTestId('game-parent-blitz')).toBeInTheDocument();
    expect(screen.queryByTestId('games-list')).not.toBeInTheDocument();
  });

  it('returns to the list when the back button is clicked', async () => {
    const user = userEvent.setup();
    render(<ParentGamesHub />);

    await user.click(screen.getByTestId('game-card-equation-of-the-day'));
    expect(screen.getByTestId('game-equation-of-the-day')).toBeInTheDocument();

    await user.click(screen.getByTestId('back-button'));

    expect(screen.getByTestId('games-list')).toBeInTheDocument();
    expect(screen.queryByTestId('game-view')).not.toBeInTheDocument();
  });

  it('opens the number merge game when clicked', async () => {
    const user = userEvent.setup();
    render(<ParentGamesHub />);

    await user.click(screen.getByTestId('game-card-number-merge'));

    expect(screen.getByTestId('game-view')).toBeInTheDocument();
    expect(screen.getByTestId('game-number-merge')).toBeInTheDocument();
  });

  it('does not open a coming-soon game', async () => {
    const user = userEvent.setup();
    render(<ParentGamesHub />);

    await user.click(screen.getByTestId('game-card-math-crossword'));

    expect(screen.getByTestId('games-list')).toBeInTheDocument();
    expect(screen.queryByTestId('game-view')).not.toBeInTheDocument();
  });
});
