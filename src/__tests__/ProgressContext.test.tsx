import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ProfileProvider, useProfile } from '../context/ProfileContext';
import { ProgressProvider, useProgress } from '../context/ProgressContext';

describe('ProgressContext', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider>
            <ProgressProvider>
                {children}
            </ProgressProvider>
        </ProfileProvider>
    );

    it('loading progress for a profile', async () => {
        const profileData = {
            id: 'test-profile-1',
            name: 'Maya',
            age: 6,
            avatarId: '👧',
            mascotId: 'owl',
            themeId: 'default',
            streak: 0,
            createdAt: Date.now(),
            lastPlayedAt: Date.now(),
            settings: { musicVolume: 1, sfxVolume: 1, isMuted: false },
            capabilities: {},
            arcadeStats: {}
        };

        localStorage.setItem('hebrew-math-profiles', JSON.stringify([profileData]));
        localStorage.setItem('hebrew_game_saga_progress_v1_test-profile-1', JSON.stringify({
            'n1_1': { stars: 3, isLocked: false }
        }));

        const { result } = renderHook(() => ({
            profileCtx: useProfile(),
            progressCtx: useProgress()
        }), { wrapper });

        act(() => {
            result.current.profileCtx.switchProfile('test-profile-1');
        });

        expect(result.current.progressCtx.getStars('n1_1')).toBe(3);
    });

    it('saving progress updates localStorage', async () => {
        const { result } = renderHook(() => ({
            profileCtx: useProfile(),
            progressCtx: useProgress()
        }), { wrapper });

        await act(async () => {
            await result.current.profileCtx.createProfile('Saver', 7, '👧', 'owl');
        });

        const profileId = result.current.profileCtx.profile!.id;

        act(() => {
            result.current.progressCtx.completeNode('n1_1', 2);
        });

        expect(result.current.progressCtx.getStars('n1_1')).toBe(2);

        const savedProgress = JSON.parse(
            localStorage.getItem(`hebrew_game_saga_progress_v1_${profileId}`) || '{}'
        );
        expect(savedProgress['n1_1']).toBeDefined();
        expect(savedProgress['n1_1'].stars).toBe(2);
    });

    it('legacy migration only happens once', async () => {
        const legacyKey = 'hebrew_game_saga_progress_v1';
        localStorage.setItem(legacyKey, JSON.stringify({
            'n1_1': { stars: 2, isLocked: false }
        }));

        const { result } = renderHook(() => ({
            profileCtx: useProfile(),
            progressCtx: useProgress()
        }), { wrapper });

        // User A creates profile -> legacy progress is migrated and old key deleted
        await act(async () => {
            await result.current.profileCtx.createProfile('UserA', 6, '👧', 'owl');
        });

        expect(result.current.progressCtx.getStars('n1_1')).toBe(2);
        expect(localStorage.getItem(legacyKey)).toBeNull();

        // User B creates profile -> legacy key is gone, receives default progress
        await act(async () => {
            await result.current.profileCtx.createProfile('UserB', 6, '👦', 'lion');
        });

        expect(localStorage.getItem(legacyKey)).toBeNull();
    });
});
