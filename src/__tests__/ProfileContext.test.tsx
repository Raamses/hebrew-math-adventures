import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ProfileProvider, useProfile } from '../context/ProfileContext';
import { ProgressProvider } from '../context/ProgressContext';

describe('ProfileContext', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('creating a profile persists to localStorage', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });

        await act(async () => {
            await result.current.createProfile('תמר', 7, '👧', 'owl');
        });

        expect(result.current.profile?.name).toBe('תמר');

        const storedRaw = localStorage.getItem('hebrew-math-profiles');
        expect(storedRaw).not.toBeNull();
        const storedProfiles = JSON.parse(storedRaw!);
        expect(storedProfiles).toHaveLength(1);
        expect(storedProfiles[0].name).toBe('תמר');
    });

    it('updating a profile validates fields (invalid mascotId is stripped)', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });

        await act(async () => {
            await result.current.createProfile('אלון', 8, '👦', 'bear');
        });

        const profileId = result.current.profile!.id;

        act(() => {
            result.current.updateProfile(profileId, {
                name: 'אלון החדש',
                mascotId: 'invalid_mascot' as any
            });
        });

        expect(result.current.profile?.name).toBe('אלון החדש');
        expect(result.current.profile?.mascotId).toBe('bear'); // invalid mascotId is stripped, keeps original
    });

    it('switching profiles loads correct data', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });

        await act(async () => {
            await result.current.createProfile('User1', 6, '👧', 'owl');
        });
        const id1 = result.current.profile!.id;

        await act(async () => {
            await result.current.createProfile('User2', 8, '👦', 'lion');
        });
        expect(result.current.profile?.name).toBe('User2');

        act(() => {
            result.current.switchProfile(id1);
        });

        expect(result.current.profile?.name).toBe('User1');
        expect(result.current.profile?.id).toBe(id1);
    });

    it('legacy progress migration clears old key', async () => {
        const legacyKey = 'hebrew_game_saga_progress_v1';
        localStorage.setItem(legacyKey, JSON.stringify({ node1: { stars: 3, isLocked: false } }));

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <ProfileProvider>
                <ProgressProvider>
                    {children}
                </ProgressProvider>
            </ProfileProvider>
        );

        const { result } = renderHook(() => useProfile(), { wrapper });

        await act(async () => {
            await result.current.createProfile('LegacyTestUser', 7, '👧', 'ant');
        });

        // Legacy key should be removed from localStorage after migration
        expect(localStorage.getItem(legacyKey)).toBeNull();
    });
});
