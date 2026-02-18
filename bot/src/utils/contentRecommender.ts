import { query, queryOne } from './db.js';
import { cached, TTL } from './cache.js';
import { logger } from './logger.js';

const recLog = logger.child({ component: 'contentRecommender' });

// ── Types ────────────────────────────────────────────────────────────

interface Article {
  [key: string]: unknown;
  id: number;
  title: string;
  summary: string;
  category: string;
  read_time_min: number;
  xp_reward: number;
  cover_emoji: string;
  difficulty: string;
  tags: string[];
  is_published: boolean;
}

interface DailyTip {
  emoji: string;
  text: string;
  category: string;
  article_id: number | null;
}

// ── Category ↔ Mode mapping ──────────────────────────────────────────

const MODE_TO_CATEGORIES: Record<string, string[]> = {
  finance: ['Personal Finance'],
  fitness: ['Health'],
  productivity: ['Productivity'],
  discipline: ['Productivity', 'Health'],
  social: ['Personal Finance', 'Health', 'Productivity'],
};

// ── Helper: get user's active mode names ─────────────────────────────

async function getUserModeNames(userId: number): Promise<string[]> {
  const rows = await query<{ name: string }>(
    `SELECT m.name
     FROM user_modes um
     JOIN modes m ON um.mode_id = m.id
     WHERE um.user_id = $1 AND um.is_active = true`,
    [userId],
  );
  return rows.map((r) => r.name);
}

// ── Helper: get categories user has already read ─────────────────────

async function getReadArticleIds(userId: number): Promise<number[]> {
  const rows = await query<{ article_id: number }>(
    `SELECT article_id FROM user_content_progress WHERE user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.article_id);
}

// ── getRecommendedArticles ───────────────────────────────────────────

/**
 * Returns a ranked list of recommended articles for a user.
 * Scoring: unread > matching active modes > high XP > short read time.
 */
export async function getRecommendedArticles(
  userId: number,
  limit = 5,
): Promise<Article[]> {
  return cached<Article[]>(
    `user:${userId}:recommended_articles`,
    TTL.SHORT,
    async () => {
      const [modeNames, readIds] = await Promise.all([
        getUserModeNames(userId),
        getReadArticleIds(userId),
      ]);

      // Preferred categories from active modes
      const preferredCategories = new Set<string>();
      for (const mode of modeNames) {
        const cats = MODE_TO_CATEGORIES[mode];
        if (cats) cats.forEach((c) => preferredCategories.add(c));
      }

      // Fetch published articles (up to 50 candidates)
      const articles = await query<Article>(
        `SELECT id, title, summary, category, read_time_min,
                xp_reward, cover_emoji, difficulty, tags, is_published
         FROM content_articles
         WHERE is_published = true
         ORDER BY created_at DESC
         LIMIT 50`,
      );

      const readSet = new Set(readIds);

      // Score each article
      const scored = articles.map((a) => {
        let score = 0;

        // Unread bonus (+100)
        if (!readSet.has(a.id)) score += 100;

        // Mode-matching category bonus (+50)
        if (preferredCategories.has(a.category)) score += 50;

        // Higher XP reward (+xp_reward)
        score += a.xp_reward;

        // Short articles slightly preferred for "Today's Read" (+10 if <=5 min)
        if (a.read_time_min <= 5) score += 10;

        return { article: a, score };
      });

      // Sort by score desc, then by id desc (newest first as tiebreaker)
      scored.sort((a, b) => b.score - a.score || b.article.id - a.article.id);

      return scored.slice(0, limit).map((s) => s.article);
    },
  );
}

// ── getDailyTip ──────────────────────────────────────────────────────

const FALLBACK_TIPS: DailyTip[] = [
  { emoji: '💡', text: 'Set aside 10% of any income the moment you receive it.', category: 'Personal Finance', article_id: null },
  { emoji: '🏃', text: 'Even a 10-minute walk counts — consistency beats intensity.', category: 'Health', article_id: null },
  { emoji: '⏰', text: 'Start your hardest task within the first hour of work.', category: 'Productivity', article_id: null },
  { emoji: '💧', text: 'Drink a glass of water before each meal.', category: 'Health', article_id: null },
  { emoji: '📊', text: 'Track every expense for a week — awareness changes behavior.', category: 'Personal Finance', article_id: null },
  { emoji: '🎯', text: 'Write tomorrow\'s top 3 priorities tonight.', category: 'Productivity', article_id: null },
  { emoji: '😴', text: 'Screens off 30 minutes before bed improves sleep quality.', category: 'Health', article_id: null },
];

/**
 * Returns a daily tip based on the day-of-year and (optionally) user modes.
 * If content_articles exist, extracts a tip from a random article summary.
 */
export async function getDailyTip(userId?: number): Promise<DailyTip> {
  try {
    // Day-of-year seed for deterministic daily rotation
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
    );

    // Try to pull a tip from an article summary
    const article = await queryOne<{ id: number; summary: string; cover_emoji: string; category: string }>(
      `SELECT id, summary, cover_emoji, category
       FROM content_articles
       WHERE is_published = true
       ORDER BY id
       LIMIT 1 OFFSET $1`,
      [dayOfYear % 50], // cycle through first 50 articles
    );

    if (article) {
      // Truncate summary to first sentence for a snappy tip
      const firstSentence = article.summary.split(/[.!?]/)[0].trim();
      return {
        emoji: article.cover_emoji || '📖',
        text: firstSentence.length > 10 ? firstSentence : article.summary.slice(0, 100),
        category: article.category,
        article_id: article.id,
      };
    }

    // Fallback to static tips
    return FALLBACK_TIPS[dayOfYear % FALLBACK_TIPS.length];
  } catch (err) {
    recLog.error('Failed to get daily tip', err as Error);
    return FALLBACK_TIPS[0];
  }
}
