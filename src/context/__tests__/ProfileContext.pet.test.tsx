import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ProfileProvider, useProfile } from '../ProfileContext';

describe('ProfileContext — pet/gems validation (P0-profile)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    const createProfile = async (result: ReturnType<typeof renderHook<ReturnType<typeof useProfile>>['result']>) => {
        await act(async () => {
            await result.current.createProfile('TestKid', 7, '👧', 'owl');
        });
        return result.current.profile!.id;
    };

    it('valid pet persists', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        const validPet = {
            species: 'owl' as const,
            name: 'Hooty',
            happiness: 75,
            unlockedTricks: ['spin'],
            lastFedDate: '2026-08-01',
        };

        act(() => {
            result.current.updateProfile(profileId, { pet: validPet });
        });

        expect(result.current.profile?.pet).toEqual(validPet);
        expect(result.current.profile?.pet?.species).toBe('owl');
        expect(result.current.profile?.pet?.name).toBe('Hooty');
    });

    it('valid gems persist', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        act(() => {
            result.current.updateProfile(profileId, { gems: 500 });
        });

        expect(result.current.profile?.gems).toBe(500);
    });

    it('invalid pet (bad species) is stripped', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        const invalidPet = {
            species: 'dragon-turtle', // not in whitelist
            name: 'Spike',
            happiness: 50,
            unlockedTricks: [],
            lastFedDate: null,
        };

        act(() => {
            result.current.updateProfile(profileId, { pet: invalidPet as any });
        });

        expect(result.current.profile?.pet).toBeUndefined();
    });

    it('invalid pet (missing name) is stripped', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        const invalidPet = {
            species: 'cat',
            // name missing
            happiness: 50,
            unlockedTricks: [],
            lastFedDate: null,
        };

        act(() => {
            result.current.updateProfile(profileId, { pet: invalidPet as any });
        });

        expect(result.current.profile?.pet).toBeUndefined();
    });

    it('invalid pet (happiness > 100) is stripped', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        const invalidPet = {
            species: 'dragon',
            name: 'Scorch',
            happiness: 150, // > 100
            unlockedTricks: [],
            lastFedDate: null,
        };

        act(() => {
            result.current.updateProfile(profileId, { pet: invalidPet as any });
        });

        expect(result.current.profile?.pet).toBeUndefined();
    });

    it('null pet persists (clearing pet)', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        // First set a valid pet
        act(() => {
            result.current.updateProfile(profileId, {
                pet: {
                    species: 'robot',
                    name: 'Beep',
                    happiness: 100,
                    unlockedTricks: ['dance'],
                    lastFedDate: '2026-07-31',
                },
            });
        });
        expect(result.current.profile?.pet).not.toBeNull();

        // Then clear it with null
        act(() => {
            result.current.updateProfile(profileId, { pet: null });
        });

        expect(result.current.profile?.pet).toBeNull();
    });

    it('negative gems are stripped', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        act(() => {
            result.current.updateProfile(profileId, { gems: -50 });
        });

        expect(result.current.profile?.gems).toBeUndefined();
    });

    it('NaN gems are stripped', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        act(() => {
            result.current.updateProfile(profileId, { gems: NaN });
        });

        expect(result.current.profile?.gems).toBeUndefined();
    });

    it('undefined gems defaults to 0 on migration', async () => {
        // Pre-populate localStorage with a profile that has no gems field
        const profileData = [{
            id: 'test-migration',
            name: 'MigratedKid',
            age: 6,
            avatarId: '🦁',
            mascotId: 'owl',
            themeId: 'default',
            streak: 0,
            createdAt: Date.now(),
            lastPlayedAt: Date.now(),
            settings: { musicVolume: 1, sfxVolume: 1, isMuted: false, soundGarden: false },
            capabilities: { age: 6, estimatedLevel: 1, strengths: [], weaknesses: [], masteryScore: {} },
            arcadeStats: {},
            sessionHistory: [],
        }];
        localStorage.setItem('hebrew-math-profiles', JSON.stringify(profileData));

        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });

        act(() => {
            result.current.switchProfile('test-migration');
        });

        expect(result.current.profile?.gems).toBe(0);
        expect(result.current.profile?.pet).toEqual({ species: 'owl', name: 'באדי', happiness: 60, unlockedTricks: [], lastFedDate: null });
    });

    it('pet with name > 20 chars is stripped', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        const invalidPet = {
            species: 'cat',
            name: 'A'.repeat(21), // 21 chars > 20 max
            happiness: 50,
            unlockedTricks: [],
            lastFedDate: null,
        };

        act(() => {
            result.current.updateProfile(profileId, { pet: invalidPet as any });
        });

        expect(result.current.profile?.pet).toBeUndefined();
    });

    it('pet with non-string unlockedTricks is stripped', async () => {
        const { result } = renderHook(() => useProfile(), { wrapper: ProfileProvider });
        const profileId = await createProfile(result);

        const invalidPet = {
            species: 'owl',
            name: 'Hooty',
            happiness: 75,
            unlockedTricks: ['spin', 123], // mixed type
            lastFedDate: null,
        };

        act(() => {
            result.current.updateProfile(profileId, { pet: invalidPet as any });
        });

        expect(result.current.profile?.pet).toBeUndefined();
    });
});