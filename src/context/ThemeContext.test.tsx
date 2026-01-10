// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import * as ProfileContextModule from './ProfileContext';
import { THEMES } from '../lib/themes';

// Mock useProfile
const mockUpdateProfile = vi.fn();
const mockUseProfile = vi.spyOn(ProfileContextModule, 'useProfile');

describe('ThemeContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        document.documentElement.style.cssText = '';

        // Default mock implementation: Guest user
        mockUseProfile.mockReturnValue({
            profile: null,
            allProfiles: [],
            createProfile: vi.fn(),
            switchProfile: vi.fn(),
            deleteProfile: vi.fn(),
            logout: vi.fn(),
            resetStreak: vi.fn(),
            incrementStreak: vi.fn(),
            updateMascot: vi.fn(),
            updateProfile: mockUpdateProfile,
            updateArcadeBestScore: vi.fn()
        });
    });

    it('uses default theme when no profile and no localStorage', () => {
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        expect(result.current.currentTheme.id).toBe('default');
    });

    it('loads from localStorage for guest user', () => {
        localStorage.setItem('hebrew-math-theme', 'space');
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        expect(result.current.currentTheme.id).toBe('space');
    });

    it('syncs with logged-in user profile', () => {
        // Mock logged in user with 'forest' theme
        mockUseProfile.mockReturnValue({
            profile: { id: '123', themeId: 'forest' } as any,
            allProfiles: [],
            createProfile: vi.fn(),
            switchProfile: vi.fn(),
            deleteProfile: vi.fn(),
            logout: vi.fn(),
            resetStreak: vi.fn(),
            incrementStreak: vi.fn(),
            updateMascot: vi.fn(),
            updateProfile: mockUpdateProfile,
            updateArcadeBestScore: vi.fn()
        } as any);

        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

        // Should ignore localStorage/default and use profile theme
        expect(result.current.currentTheme.id).toBe('forest');
    });

    it('updates profile when theme changes (logged in)', () => {
        const profile = { id: '123', themeId: 'default' };
        mockUseProfile.mockReturnValue({
            profile: profile as any,
            // ... other mocks
            updateProfile: mockUpdateProfile,
        } as any);

        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

        act(() => {
            result.current.setTheme('candy');
        });

        // Should call updateProfile
        expect(mockUpdateProfile).toHaveBeenCalledWith('123', { themeId: 'candy' });
        // Local state updates immediately? Yes, but mostly relies on profile sync in real app.
        // In our implementation, we update local state immediately too.
        expect(result.current.currentTheme.id).toBe('candy');
    });

    it('persists to localStorage when theme changes (guest)', () => {
        mockUseProfile.mockReturnValue({ profile: null } as any);

        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

        act(() => {
            result.current.setTheme('space');
        });

        expect(localStorage.getItem('hebrew-math-theme')).toBe('space');
        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('applies CSS variables to document', () => {
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

        act(() => {
            result.current.setTheme('forest');
        });

        const rootStyle = document.documentElement.style;
        const forestTheme = THEMES.find(t => t.id === 'forest')!;

        expect(rootStyle.getPropertyValue('--color-primary')).toBe(forestTheme.colors.primary);
        expect(rootStyle.getPropertyValue('--color-background')).toBe(forestTheme.colors.background);
    });
});
