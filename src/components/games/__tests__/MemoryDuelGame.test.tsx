import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// --- Mocks (must come before component import) ---

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...p }: any) => React.createElement('div', p, children),
        button: ({ children, ...p }: any) => React.createElement('button', p, children),
    },
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}))

vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal() as typeof import('lucide-react')
    return {
        ...actual,
        Clock: () => React.createElement('span', { 'data-testid': 'icon-clock' }),
        RotateCcw: () => React.createElement('span', { 'data-testid': 'icon-rotate' }),
        ArrowLeft: () => React.createElement('span', { 'data-testid': 'icon-arrow' }),
        Check: () => React.createElement('span', { 'data-testid': 'icon-check' }),
        Sparkles: () => React.createElement('span', { 'data-testid': 'icon-sparkles' }),
    }
})

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_k: string, f: string) => f }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('../../../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: {
            id: 't', name: 'T',
            settings: { musicVolume: 1, sfxVolume: 1, isMuted: false, soundGarden: false },
            capabilities: { skills: {} },
            stats: { totalStars: 0, totalCoins: 0, badges: [], arcadeBestScores: {}, dailyStamps: {} },
        },
        recordSession: vi.fn(),
        toggleSoundGarden: vi.fn(),
    }),
}))

vi.mock('../../../hooks/useSoundManager', () => ({
    useSoundManager: () => ({
        playCorrect: vi.fn(),
        playWrong: vi.fn(),
        playLevelUp: vi.fn(),
        playGameOver: vi.fn(),
        playClick: vi.fn(),
        playStreak: vi.fn(),
        playFrenzy: vi.fn(),
        playMilestone: vi.fn(),
        playSound: vi.fn(),
        play: vi.fn(),
        isMuted: false,
        toggleMute: vi.fn(),
        isSoundGarden: false,
        melodyCombo: 0,
        resetMelodyCombo: vi.fn(),
        playMelodyNote: vi.fn(),
        playWrongMelody: vi.fn(),
        vibrate: vi.fn(),
    }),
}))

// --- localStorage mock ---
const mockStorage: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => { mockStorage[k] = v },
        removeItem: (k: string) => { delete mockStorage[k] },
        clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) },
    },
})
Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), writable: true })

// --- Import AFTER all mocks ---
import { MemoryDuelGame } from '../MemoryDuelGame'

/**
 * Helper: get only card buttons (exclude the Back button which has aria-label="Back").
 */
function getCardButtons(): HTMLElement[] {
    return screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-label') !== 'Back')
}

describe('MemoryDuelGame', () => {
    beforeEach(() => {
        Object.keys(mockStorage).forEach(k => delete mockStorage[k])
        vi.clearAllMocks()
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders 12 cards', () => {
        render(React.createElement(MemoryDuelGame, { level: 1, onExit: vi.fn() }))
        expect(getCardButtons()).toHaveLength(12)
    })

    it('no card is disabled', () => {
        render(React.createElement(MemoryDuelGame, { level: 1, onExit: vi.fn() }))
        getCardButtons().forEach(c => expect(c).not.toBeDisabled())
    })

    it('cards show owl face-down', () => {
        render(React.createElement(MemoryDuelGame, { level: 1, onExit: vi.fn() }))
        getCardButtons().forEach(c => expect(c.textContent).toContain('🦉'))
    })

    it('click flips a card', () => {
        render(React.createElement(MemoryDuelGame, { level: 1, onExit: vi.fn() }))
        const cards = getCardButtons()
        // Before click, all cards are face-down (aria-label = 'Hidden card')
        cards.forEach(c => expect(c.getAttribute('aria-label')).toBe('Hidden card'))
        fireEvent.click(cards[0])
        // After click, the first card should show its display value (not 'Hidden card')
        expect(cards[0].getAttribute('aria-label')).not.toBe('Hidden card')
    })

    it('double-click same card stays flipped (only 1 flipped)', () => {
        render(React.createElement(MemoryDuelGame, { level: 1, onExit: vi.fn() }))
        const cards = getCardButtons()
        fireEvent.click(cards[0])
        fireEvent.click(cards[0]) // should be ignored — already flipped
        // Only one card should be flipped (aria-label != 'Hidden card')
        const flipped = cards.filter(c => c.getAttribute('aria-label') !== 'Hidden card')
        expect(flipped).toHaveLength(1)
    })

    it('two different cards = 1 move', () => {
        render(React.createElement(MemoryDuelGame, { level: 1, onExit: vi.fn() }))
        const cards = getCardButtons()
        fireEvent.click(cards[0])
        fireEvent.click(cards[1])
        expect(screen.getByText(/Moves: 1/)).toBeInTheDocument()
    })

    it('math has dir=ltr', () => {
        const { container } = render(React.createElement(MemoryDuelGame, { level: 1, onExit: vi.fn() }))
        fireEvent.click(getCardButtons()[0])
        expect(container.querySelectorAll('[dir="ltr"]').length).toBeGreaterThan(0)
    })

    it('shows title and counters', () => {
        render(React.createElement(MemoryDuelGame, { level: 1, onExit: vi.fn() }))
        expect(screen.getByText(/Memory Duel/)).toBeInTheDocument()
        expect(screen.getByText(/Moves: 0/)).toBeInTheDocument()
        expect(screen.getByText('0/6')).toBeInTheDocument()
    })

    it('back button works', () => {
        const onExit = vi.fn()
        render(React.createElement(MemoryDuelGame, { level: 1, onExit: onExit }))
        fireEvent.click(screen.getByLabelText('Back'))
        expect(onExit).toHaveBeenCalled()
    })
})