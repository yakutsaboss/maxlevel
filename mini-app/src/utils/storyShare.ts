import WebApp from '@twa-dev/sdk';
import { logger } from '@/utils/logger';

const STORY_AVAILABLE = typeof WebApp?.shareToStory === 'function';
const APP_URL = 'https://t.me/yakutsabot/levelapp';

export async function shareQuestToStory(questName: string): Promise<boolean> {
  if (!STORY_AVAILABLE) return false;
  try {
    WebApp.shareToStory(APP_URL, {
      text: `I completed the quest "${questName}"! 🎯`,
      widget_link: { url: APP_URL, name: 'Play MaxLevel' },
    });
    return true;
  } catch (e) {
    logger.error('shareToStory failed', { error: e });
    return false;
  }
}

export async function shareLevelUpToStory(level: number): Promise<boolean> {
  if (!STORY_AVAILABLE) return false;
  try {
    WebApp.shareToStory(APP_URL, {
      text: `I just reached Level ${level}! ⭐`,
      widget_link: { url: APP_URL, name: 'Play MaxLevel' },
    });
    return true;
  } catch (e) {
    logger.error('shareToStory failed', { error: e });
    return false;
  }
}

export async function shareAchievementToStory(name: string, rarity: string): Promise<boolean> {
  if (!STORY_AVAILABLE) return false;
  try {
    WebApp.shareToStory(APP_URL, {
      text: `I unlocked "${name}" (${rarity})! 🏆`,
      widget_link: { url: APP_URL, name: 'Play MaxLevel' },
    });
    return true;
  } catch (e) {
    logger.error('shareToStory failed', { error: e });
    return false;
  }
}

export function isShareToStoryAvailable(): boolean {
  return STORY_AVAILABLE;
}
