import { describe, it, expect } from 'vitest';
import { getPetStage, getPetEmoji, decayedHappiness, PET_STAGES } from '../pet';
import type { PetState, PetSpecies } from '../../types/user';

describe('pet engine', () => {
  describe('getPetStage', () => {
    it('level 1 → egg', () => {
      expect(getPetStage(1).key).toBe('egg');
    });
    it('level 2 → baby', () => {
      expect(getPetStage(2).key).toBe('baby');
    });
    it('level 4 → child', () => {
      expect(getPetStage(4).key).toBe('child');
    });
    it('level 6 → teen', () => {
      expect(getPetStage(6).key).toBe('teen');
    });
    it('level 8 → adult', () => {
      expect(getPetStage(8).key).toBe('adult');
    });
    it('level 5 → child', () => {
      expect(getPetStage(5).key).toBe('child');
    });
    it('level 7 → teen', () => {
      expect(getPetStage(7).key).toBe('teen');
    });
    it('level 10 → adult', () => {
      expect(getPetStage(10).key).toBe('adult');
    });
    it('level 0 → egg (fallback)', () => {
      expect(getPetStage(0).key).toBe('egg');
    });
    it('NaN → egg (fallback)', () => {
      expect(getPetStage(NaN).key).toBe('egg');
    });
  });

  describe('getPetEmoji', () => {
    it('owl at level 1 → 🥚', () => {
      expect(getPetEmoji('owl', 1)).toBe('🥚');
    });
    it('owl at level 2 → 🐣', () => {
      expect(getPetEmoji('owl', 2)).toBe('🐣');
    });
    it('owl at level 4 → 🦉', () => {
      expect(getPetEmoji('owl', 4)).toBe('🦉');
    });
    it('owl at level 8 → 🦅', () => {
      expect(getPetEmoji('owl', 8)).toBe('🦅');
    });
    it('cat at level 1 → 🥚', () => {
      expect(getPetEmoji('cat', 1)).toBe('🥚');
    });
    it('cat at level 8 → 🐈⬛', () => {
      expect(getPetEmoji('cat', 8)).toBe('🐈⬛');
    });
    it('dragon at level 2 → 🐉', () => {
      expect(getPetEmoji('dragon', 2)).toBe('🐉');
    });
    it('robot at level 1 → 📦', () => {
      expect(getPetEmoji('robot', 1)).toBe('📦');
    });
    it('robot at level 8 → 🦿', () => {
      expect(getPetEmoji('robot', 8)).toBe('🦿');
    });
  });

  describe('decayedHappiness', () => {
    const basePet: PetState = {
      species: 'owl' as PetSpecies,
      name: 'Test',
      happiness: 80,
      unlockedTricks: [],
      lastFedDate: null,
    };

    it('floors at 50', () => {
      const pet: PetState = { ...basePet, happiness: 30, lastFedDate: '2026-01-01' };
      expect(decayedHappiness(pet, '2026-08-01')).toBe(50);
    });

    it('returns happiness when lastFedDate is null', () => {
      const pet: PetState = { ...basePet, happiness: 75, lastFedDate: null };
      expect(decayedHappiness(pet, '2026-08-01')).toBe(75);
    });

    it('decreases by days since lastFedDate', () => {
      const pet: PetState = { ...basePet, happiness: 80, lastFedDate: '2026-07-29' };
      // 2 days since feeding → 80 - 2 = 78
      expect(decayedHappiness(pet, '2026-07-31')).toBe(78);
    });

    it('floors at 50 even with many days passed', () => {
      const pet: PetState = { ...basePet, happiness: 60, lastFedDate: '2026-01-01' };
      // Many days → should floor at 50
      expect(decayedHappiness(pet, '2026-08-01')).toBe(50);
    });

    it('same day feeding returns full happiness', () => {
      const pet: PetState = { ...basePet, happiness: 90, lastFedDate: '2026-08-01' };
      expect(decayedHappiness(pet, '2026-08-01')).toBe(90);
    });
  });

  describe('PET_STAGES', () => {
    it('has 5 stages', () => {
      expect(PET_STAGES).toHaveLength(5);
    });
    it('stages are in order', () => {
      expect(PET_STAGES.map(s => s.key)).toEqual(['egg', 'baby', 'child', 'teen', 'adult']);
    });
  });
});