import { describe, test, expect } from 'vitest';
import { getPowerUpEmoji, POWER_UP_TYPES } from '../useGameEngine';
import type { PowerUpType } from '../types';

describe('Power-up types and emoji', () => {
  test('POWER_UP_TYPES includes lightning_chain and rainbow_magnet', () => {
    expect(POWER_UP_TYPES).toContain('lightning_chain');
    expect(POWER_UP_TYPES).toContain('rainbow_magnet');
  });

  test('POWER_UP_TYPES has exactly 6 entries', () => {
    expect(POWER_UP_TYPES).toHaveLength(6);
  });

  test('getPowerUpEmoji returns correct emoji for all types', () => {
    expect(getPowerUpEmoji('freeze')).toBe('❄️');
    expect(getPowerUpEmoji('double_points')).toBe('✨');
    expect(getPowerUpEmoji('pop_distractors')).toBe('💥');
    expect(getPowerUpEmoji('slow_motion')).toBe('🐌');
    expect(getPowerUpEmoji('lightning_chain')).toBe('⚡');
    expect(getPowerUpEmoji('rainbow_magnet')).toBe('🌈');
  });

  test('getPowerUpEmoji handles all POWER_UP_TYPES entries', () => {
    for (const type of POWER_UP_TYPES) {
      const emoji = getPowerUpEmoji(type);
      expect(emoji).toBeTruthy();
      expect(typeof emoji).toBe('string');
    }
  });
});

describe('PowerUpType type safety', () => {
  test('all POWER_UP_TYPES are valid PowerUpType values', () => {
    const validTypes: PowerUpType[] = [
      'freeze',
      'double_points',
      'pop_distractors',
      'slow_motion',
      'lightning_chain',
      'rainbow_magnet',
    ];
    for (const type of POWER_UP_TYPES) {
      expect(validTypes).toContain(type);
    }
  });
});