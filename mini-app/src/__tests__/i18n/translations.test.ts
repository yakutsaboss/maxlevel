import { describe, it, expect } from 'vitest';
import en from '@/i18n/en';
import ru from '@/i18n/ru';
import zh from '@/i18n/zh';

type TranslationObj = Record<string, unknown>;

/**
 * Recursively extract all keys from a nested object, joining with dot notation.
 * e.g. { a: { b: "val" } } => ["a.b"]
 */
function getKeys(obj: TranslationObj, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getKeys(value as TranslationObj, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

/**
 * Get the value at a dot-separated path.
 */
function getValue(obj: TranslationObj, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as TranslationObj)[part];
  }
  return current;
}

const languages = [
  { name: 'en', translations: en },
  { name: 'ru', translations: ru },
  { name: 'zh', translations: zh },
] as const;

const enKeys = getKeys(en as TranslationObj);

describe('i18n Translations', () => {
  it('English has translation keys defined', () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  describe.each(languages)('$name translations', ({ name, translations }) => {
    const keys = getKeys(translations as TranslationObj);

    it('has the same keys as English', () => {
      expect(keys).toEqual(enKeys);
    });

    it('has no empty string values', () => {
      const emptyKeys: string[] = [];
      for (const key of keys) {
        const val = getValue(translations as TranslationObj, key);
        if (typeof val === 'string' && val.trim() === '') {
          emptyKeys.push(key);
        }
      }
      expect(emptyKeys).toEqual([]);
    });

    it('all leaf values are strings', () => {
      const nonStringKeys: string[] = [];
      for (const key of keys) {
        const val = getValue(translations as TranslationObj, key);
        if (typeof val !== 'string') {
          nonStringKeys.push(`${key} (${typeof val})`);
        }
      }
      expect(nonStringKeys).toEqual([]);
    });
  });

  it('has same top-level sections across all languages', () => {
    const enSections = Object.keys(en).sort();
    const ruSections = Object.keys(ru).sort();
    const zhSections = Object.keys(zh).sort();

    expect(ruSections).toEqual(enSections);
    expect(zhSections).toEqual(enSections);
  });

  it('each section has at least one key', () => {
    for (const section of Object.keys(en)) {
      const sectionObj = (en as TranslationObj)[section];
      expect(typeof sectionObj).toBe('object');
      expect(Object.keys(sectionObj as TranslationObj).length).toBeGreaterThan(0);
    }
  });
});
