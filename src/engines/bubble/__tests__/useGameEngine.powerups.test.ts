import { describe, test, expect } from 'vitest';
import { getPowerUpEmoji, POWER_UP_TYPES } from '../useGameEngine';
import type { PowerUpType } from '../types';

describe('Power-up types and emoji', () => {
  test('POWER_UP_TYPES includes lightning_chain, double_points, and rainbow_magnet', () => {
    expect(POWER_UP_TYPES).toContain('lightning_chain');
    expect(POWER_UP_TYPES).toContain('double_points');
    expect(POWER_UP_TYPES).toContain('rainbow_magnet');
  });

  test('POWER_UP_TYPES has exactly 3 entries (freeze/slow_motion/pop_distractors removed)', () => {
    expect(POWER_UP_TYPES).toHaveLength(3);
  });

  test('POWER_UP_TYPES does not include removed types', () => {
    expect(POWER_UP_TYPES).not.toContain('freeze');
    expect(POWER_UP_TYPES).not.toContain('slow_motion');
    expect(POWER_UP_TYPES).not.toContain('pop_distractors');
  });

  test('getPowerUpEmoji returns correct emoji for all kept types', () => {
    expect(getPowerUpEmoji('double_points')).toBe('✨');
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
      'double_points',
      'lightning_chain',
      'rainbow_magnet',
    ];
    for (const type of POWER_UP_TYPES) {
      expect(validTypes).toContain(type);
    }
  });
});
