import { useEffect, useRef } from 'react';
import { useCloudStorage } from './useCloudStorage';
import { logger } from '@/utils/logger';

// Keys to sync between localStorage and CloudStorage
const SYNC_KEYS = ['celebration-style', 'celebration-sticker-pack', 'haptic_enabled'];

/**
 * One-time bidirectional sync between localStorage and TG CloudStorage.
 * Called once on app mount. Server DB remains source of truth for notification/DND settings;
 * this only handles UI preferences that are localStorage-only.
 *
 * Strategy:
 * - If CloudStorage has values that localStorage doesn't → restore them (cross-device restore)
 * - If localStorage has values that CloudStorage doesn't → push them (initial backup)
 */
export function useCloudSync() {
  const cloudStorage = useCloudStorage();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current || !cloudStorage.isAvailable) return;
    synced.current = true;

    cloudStorage.getItems(SYNC_KEYS).then((cloudValues) => {
      for (const key of SYNC_KEYS) {
        const cloudVal = cloudValues[key];
        const localVal = localStorage.getItem(key);

        if (cloudVal && !localVal) {
          // CloudStorage has it, localStorage doesn't → restore
          localStorage.setItem(key, cloudVal);
          logger.info('CloudSync: restored from cloud', { key });
        } else if (localVal && !cloudVal) {
          // localStorage has it, CloudStorage doesn't → push
          cloudStorage.setItem(key, localVal).catch(() => {});
          logger.info('CloudSync: pushed to cloud', { key });
        }
        // If both have values, localStorage wins (it's the primary/instant store)
      }
    }).catch((err) => {
      logger.warn('CloudSync: failed to sync', { error: String(err) });
    });
  }, []);
}
