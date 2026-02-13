/**
 * Tests for shared avatar data (Run 57).
 *
 * Verifies that AVATAR_OPTIONS, AVATAR_EMOJI_MAP, and getAvatarById
 * from mini-app/src/data/avatarOptions.ts work correctly.
 */

import { describe, it, expect } from 'vitest';
import { AVATAR_OPTIONS, AVATAR_EMOJI_MAP, getAvatarById } from '@/data/avatarOptions';

describe('avatarOptions', () => {
  describe('AVATAR_OPTIONS', () => {
    it('should have exactly 5 avatar options', () => {
      expect(AVATAR_OPTIONS).toHaveLength(5);
    });

    it('should have sequential IDs from 1 to 5', () => {
      const ids = AVATAR_OPTIONS.map(a => a.id);
      expect(ids).toEqual([1, 2, 3, 4, 5]);
    });

    it('should have all required fields on every option', () => {
      for (const avatar of AVATAR_OPTIONS) {
        expect(avatar).toHaveProperty('id');
        expect(avatar).toHaveProperty('value');
        expect(avatar).toHaveProperty('emoji');
        expect(avatar).toHaveProperty('labelKey');
        expect(avatar).toHaveProperty('descKey');

        expect(typeof avatar.id).toBe('number');
        expect(typeof avatar.value).toBe('string');
        expect(typeof avatar.emoji).toBe('string');
        expect(typeof avatar.labelKey).toBe('string');
        expect(typeof avatar.descKey).toBe('string');
      }
    });

    it('should have non-empty emoji strings', () => {
      for (const avatar of AVATAR_OPTIONS) {
        expect(avatar.emoji.length).toBeGreaterThan(0);
      }
    });

    it('should have unique values', () => {
      const values = AVATAR_OPTIONS.map(a => a.value);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe('AVATAR_EMOJI_MAP', () => {
    it('should map all 5 avatar IDs', () => {
      expect(Object.keys(AVATAR_EMOJI_MAP)).toHaveLength(5);
    });

    it('should map each ID to its correct emoji', () => {
      for (const avatar of AVATAR_OPTIONS) {
        expect(AVATAR_EMOJI_MAP[avatar.id]).toBe(avatar.emoji);
      }
    });

    it('should return undefined for non-existent ID', () => {
      expect(AVATAR_EMOJI_MAP[999]).toBeUndefined();
    });
  });

  describe('getAvatarById', () => {
    it('should return correct avatar for valid ID', () => {
      const avatar = getAvatarById(1);
      expect(avatar).toBeDefined();
      expect(avatar!.id).toBe(1);
      expect(avatar!.value).toBe('gym_warrior');
      expect(avatar!.emoji).toBe('💪');
    });

    it('should return undefined for invalid ID', () => {
      expect(getAvatarById(0)).toBeUndefined();
      expect(getAvatarById(-1)).toBeUndefined();
      expect(getAvatarById(999)).toBeUndefined();
    });

    it('should return each avatar correctly', () => {
      for (const expected of AVATAR_OPTIONS) {
        const result = getAvatarById(expected.id);
        expect(result).toEqual(expected);
      }
    });
  });
});
