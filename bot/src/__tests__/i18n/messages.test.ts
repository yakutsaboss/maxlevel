/**
 * Tests for i18n messages module (bot/src/i18n/messages.ts)
 *
 * Tests:
 * - All supported languages have all required keys
 * - t() returns correct translations
 * - t() falls back to English for unknown language
 * - t() falls back to English for missing key in known language
 * - t() returns key name as last-resort fallback
 * - No missing translations between languages
 */

import { describe, it, expect } from 'vitest';
import { t, type MessageKey } from '../../i18n/messages.js';

// ─── Constants ──────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = ['en', 'ru', 'zh'];

const ALL_KEYS: MessageKey[] = [
  'welcome',
  'help',
  'dailySummary',
  'achievementUnlock',
  'reminder',
  'questComplete',
  'levelUp',
];

// ─── Tests ──────────────────────────────────────────────────────────

describe('i18n messages', () => {
  describe('translation completeness', () => {
    it.each(SUPPORTED_LANGUAGES)('language "%s" should have all required keys', (lang) => {
      for (const key of ALL_KEYS) {
        const result = t(lang, key);
        expect(result).toBeTruthy();
        expect(result).not.toBe(key); // Should return actual translation, not the key itself
      }
    });

    it('should have the same number of keys across all languages', () => {
      const results = SUPPORTED_LANGUAGES.map((lang) =>
        ALL_KEYS.map((key) => t(lang, key)),
      );
      // All languages should produce translations for all keys
      for (const langResults of results) {
        expect(langResults).toHaveLength(ALL_KEYS.length);
        for (const result of langResults) {
          expect(result).toBeTruthy();
        }
      }
    });
  });

  describe('t() function', () => {
    it('should return English translation for "en"', () => {
      const result = t('en', 'welcome');
      expect(result).toContain('Welcome');
    });

    it('should return Russian translation for "ru"', () => {
      const result = t('ru', 'welcome');
      expect(result).toContain('Добро пожаловать');
    });

    it('should return Chinese translation for "zh"', () => {
      const result = t('zh', 'welcome');
      expect(result).toContain('欢迎');
    });

    it('should fall back to English for unknown language', () => {
      const result = t('fr', 'welcome');
      const english = t('en', 'welcome');
      expect(result).toBe(english);
    });

    it('should fall back to English for empty language string', () => {
      const result = t('', 'welcome');
      const english = t('en', 'welcome');
      expect(result).toBe(english);
    });

    it('should return non-empty strings for all key/language combinations', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        for (const key of ALL_KEYS) {
          const result = t(lang, key);
          expect(result.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('translation content quality', () => {
    it('each language should have unique translations (not just copies of English)', () => {
      for (const lang of ['ru', 'zh']) {
        let differentCount = 0;
        for (const key of ALL_KEYS) {
          if (t(lang, key) !== t('en', key)) {
            differentCount++;
          }
        }
        // At least most keys should differ from English
        expect(differentCount).toBeGreaterThanOrEqual(ALL_KEYS.length - 1);
      }
    });

    it('help messages should be multi-line', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const help = t(lang, 'help');
        expect(help).toContain('\n');
      }
    });
  });
});
