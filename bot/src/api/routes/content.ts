import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { cached, invalidateUserCache, TTL } from '../../utils/cache.js';
import {
  asyncHandler,
  validateRequired,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();

// ── Type definitions ────────────────────────────────────────────────

interface ContentArticle {
  [key: string]: unknown;
  id: number;
  title: string;
  summary: string;
  body_html: string;
  category: string;
  read_time_min: number;
  xp_reward: number;
  cover_emoji: string | null;
  difficulty: string;
  tags: string[];
  is_published: boolean;
  created_at: string;
}

interface ContentQuiz {
  [key: string]: unknown;
  id: number;
  article_id: number;
  question: string;
  options: string[];
  correct_index: number;
  xp_reward: number;
}

interface UserContentProgress {
  [key: string]: unknown;
  user_id: number;
  article_id: number;
  read_at: string;
  quiz_score: number | null;
  xp_earned: number;
}

interface UserBookmark {
  [key: string]: unknown;
  user_id: number;
  article_id: number;
  bookmarked_at: string;
}

// ── Helper: resolve user ID from telegram_id ────────────────────────

async function resolveUserId(telegramId: number): Promise<number> {
  const user = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE telegram_id = $1 AND is_active = true',
    [telegramId]
  );
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user.id;
}

// ── GET /feed — Paginated content feed ──────────────────────────────

router.get('/feed', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, safeParseInt(req.query.page as string, 1));
  const limit = Math.min(50, Math.max(1, safeParseInt(req.query.limit as string, 10)));
  const offset = (page - 1) * limit;
  const category = req.query.category as string | undefined;
  const telegramId = req.telegramUser?.id;

  // Resolve user for read/unread tracking (optional — feed works without it)
  let userId: number | null = null;
  if (telegramId) {
    const user = await queryOne<{ id: number }>(
      'SELECT id FROM users WHERE telegram_id = $1 AND is_active = true',
      [telegramId]
    );
    userId = user?.id ?? null;
  }

  // Build WHERE conditions
  const conditions: string[] = ['ca.is_published = true'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (category) {
    conditions.push(`ca.category = $${paramIdx}`);
    params.push(category);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  // Fetch articles with read status (unread first, then by newest)
  const userIdParam = userId ? `$${paramIdx}` : 'NULL';
  if (userId) {
    params.push(userId);
    paramIdx++;
  }

  const articles = await query<ContentArticle & { is_read: boolean }>(
    `SELECT ca.id, ca.title, ca.summary, ca.category, ca.read_time_min,
            ca.xp_reward, ca.cover_emoji, ca.difficulty, ca.tags, ca.created_at,
            CASE WHEN ucp.read_at IS NOT NULL THEN true ELSE false END AS is_read
     FROM content_articles ca
     LEFT JOIN user_content_progress ucp
       ON ucp.article_id = ca.id AND ucp.user_id = ${userIdParam}
     WHERE ${whereClause}
     ORDER BY is_read ASC, ca.created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  // Total count
  const countResult = await queryOne<{ total: string }>(
    `SELECT COUNT(*) AS total FROM content_articles ca WHERE ${whereClause}`,
    params.slice(0, category ? 1 : 0)
  );
  const total = parseInt(countResult?.total || '0', 10);

  res.json(successResponse({
    articles,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }));
}));

// ── GET /:articleId — Single article detail ─────────────────────────

router.get('/:articleId', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const articleId = safeParseInt(req.params.articleId, 0);
  if (articleId <= 0) {
    throw new BadRequestError('Invalid article ID');
  }

  const article = await cached<ContentArticle | null>(
    `content:article:${articleId}`,
    TTL.MEDIUM,
    async () => {
      return queryOne<ContentArticle>(
        `SELECT id, title, summary, body_html, category, read_time_min,
                xp_reward, cover_emoji, difficulty, tags, is_published, created_at
         FROM content_articles
         WHERE id = $1 AND is_published = true`,
        [articleId]
      );
    }
  );

  if (!article) {
    throw new NotFoundError('Article not found');
  }

  // Check if user has read this article / bookmarked it
  let userStatus: { is_read: boolean; is_bookmarked: boolean; quiz_score: number | null } = {
    is_read: false,
    is_bookmarked: false,
    quiz_score: null,
  };

  const telegramId = req.telegramUser?.id;
  if (telegramId) {
    const user = await queryOne<{ id: number }>(
      'SELECT id FROM users WHERE telegram_id = $1 AND is_active = true',
      [telegramId]
    );
    if (user) {
      const progress = await queryOne<{ read_at: string; quiz_score: number | null }>(
        'SELECT read_at, quiz_score FROM user_content_progress WHERE user_id = $1 AND article_id = $2',
        [user.id, articleId]
      );
      const bookmark = await queryOne<{ bookmarked_at: string }>(
        'SELECT bookmarked_at FROM user_bookmarks WHERE user_id = $1 AND article_id = $2',
        [user.id, articleId]
      );
      userStatus = {
        is_read: !!progress,
        is_bookmarked: !!bookmark,
        quiz_score: progress?.quiz_score ?? null,
      };
    }
  }

  res.json(successResponse({ ...article, ...userStatus }));
}));

// ── POST /:articleId/read — Mark article as read + award XP ─────────

router.post('/:articleId/read', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const articleId = safeParseInt(req.params.articleId, 0);
  if (articleId <= 0) {
    throw new BadRequestError('Invalid article ID');
  }

  const { telegram_id } = req.body;
  validateRequired(req.body, ['telegram_id']);

  const tgId = safeParseInt(telegram_id, 0);
  if (tgId !== req.telegramUser?.id) {
    throw new BadRequestError('Telegram ID mismatch');
  }

  const userId = await resolveUserId(tgId);

  // Verify article exists
  const article = await queryOne<{ id: number; xp_reward: number }>(
    'SELECT id, xp_reward FROM content_articles WHERE id = $1 AND is_published = true',
    [articleId]
  );
  if (!article) {
    throw new NotFoundError('Article not found');
  }

  // Check if already read
  const existing = await queryOne<{ read_at: string }>(
    'SELECT read_at FROM user_content_progress WHERE user_id = $1 AND article_id = $2',
    [userId, articleId]
  );

  if (existing) {
    res.json(successResponse({ already_read: true, xp_earned: 0 }));
    return;
  }

  // Mark as read and award XP
  const readXp = article.xp_reward;

  await execute(
    `INSERT INTO user_content_progress (user_id, article_id, read_at, xp_earned)
     VALUES ($1, $2, NOW(), $3)`,
    [userId, articleId, readXp]
  );

  await execute(
    'UPDATE users SET total_xp = total_xp + $1 WHERE id = $2',
    [readXp, userId]
  );

  invalidateUserCache(userId);

  res.status(201).json(successResponse({
    already_read: false,
    xp_earned: readXp,
  }));
}));

// ── GET /:articleId/quiz — Get quiz questions for an article ────────

router.get('/:articleId/quiz', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const articleId = safeParseInt(req.params.articleId, 0);
  if (articleId <= 0) {
    throw new BadRequestError('Invalid article ID');
  }

  // Verify article exists
  const article = await queryOne<{ id: number; title: string }>(
    'SELECT id, title FROM content_articles WHERE id = $1 AND is_published = true',
    [articleId]
  );
  if (!article) {
    throw new NotFoundError('Article not found');
  }

  const questions = await cached<ContentQuiz[]>(
    `content:quiz:${articleId}`,
    TTL.MEDIUM,
    async () => {
      return query<ContentQuiz>(
        `SELECT id, article_id, question, options, correct_index, xp_reward
         FROM content_quiz
         WHERE article_id = $1
         ORDER BY id`,
        [articleId]
      );
    }
  );

  // Strip correct_index from response (don't leak answers to client)
  const safeQuestions = questions.map(({ correct_index: _ci, ...q }) => q);

  res.json(successResponse({
    article_id: articleId,
    article_title: article.title,
    questions: safeQuestions,
    total_questions: safeQuestions.length,
  }));
}));

// ── POST /:articleId/quiz — Submit quiz answers + award XP ──────────

router.post('/:articleId/quiz', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const articleId = safeParseInt(req.params.articleId, 0);
  if (articleId <= 0) {
    throw new BadRequestError('Invalid article ID');
  }

  const { telegram_id, answers } = req.body;
  validateRequired(req.body, ['telegram_id', 'answers']);

  if (!Array.isArray(answers)) {
    throw new BadRequestError('answers must be an array of selected option indices');
  }

  const tgId = safeParseInt(telegram_id, 0);
  if (tgId !== req.telegramUser?.id) {
    throw new BadRequestError('Telegram ID mismatch');
  }

  const userId = await resolveUserId(tgId);

  // Get quiz questions with correct answers
  const questions = await query<ContentQuiz>(
    `SELECT id, article_id, question, options, correct_index, xp_reward
     FROM content_quiz
     WHERE article_id = $1
     ORDER BY id`,
    [articleId]
  );

  if (questions.length === 0) {
    throw new NotFoundError('No quiz found for this article');
  }

  if (answers.length !== questions.length) {
    throw new BadRequestError(`Expected ${questions.length} answers, got ${answers.length}`);
  }

  // Grade the quiz
  let correctCount = 0;
  let totalXp = 0;
  const results: { question_id: number; correct: boolean; correct_index: number; selected_index: number }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const selectedIndex = safeParseInt(String(answers[i]), -1);
    const isCorrect = selectedIndex === q.correct_index;

    if (isCorrect) {
      correctCount++;
      totalXp += q.xp_reward;
    }

    results.push({
      question_id: q.id,
      correct: isCorrect,
      correct_index: q.correct_index,
      selected_index: selectedIndex,
    });
  }

  const score = Math.round((correctCount / questions.length) * 100);

  // Update user_content_progress with quiz score (upsert)
  await execute(
    `INSERT INTO user_content_progress (user_id, article_id, read_at, quiz_score, xp_earned)
     VALUES ($1, $2, NOW(), $3, COALESCE((SELECT xp_earned FROM user_content_progress WHERE user_id = $1 AND article_id = $2), 0) + $4)
     ON CONFLICT (user_id, article_id)
     DO UPDATE SET quiz_score = $3, xp_earned = user_content_progress.xp_earned + $4`,
    [userId, articleId, score, totalXp]
  );

  // Award XP
  if (totalXp > 0) {
    await execute(
      'UPDATE users SET total_xp = total_xp + $1 WHERE id = $2',
      [totalXp, userId]
    );
  }

  invalidateUserCache(userId);

  res.json(successResponse({
    score,
    correct_count: correctCount,
    total_questions: questions.length,
    xp_earned: totalXp,
    results,
  }));
}));

// ── POST /:articleId/bookmark — Toggle bookmark ─────────────────────

router.post('/:articleId/bookmark', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const articleId = safeParseInt(req.params.articleId, 0);
  if (articleId <= 0) {
    throw new BadRequestError('Invalid article ID');
  }

  const { telegram_id } = req.body;
  validateRequired(req.body, ['telegram_id']);

  const tgId = safeParseInt(telegram_id, 0);
  if (tgId !== req.telegramUser?.id) {
    throw new BadRequestError('Telegram ID mismatch');
  }

  const userId = await resolveUserId(tgId);

  // Verify article exists
  const article = await queryOne<{ id: number }>(
    'SELECT id FROM content_articles WHERE id = $1 AND is_published = true',
    [articleId]
  );
  if (!article) {
    throw new NotFoundError('Article not found');
  }

  // Toggle bookmark
  const existing = await queryOne<UserBookmark>(
    'SELECT user_id, article_id, bookmarked_at FROM user_bookmarks WHERE user_id = $1 AND article_id = $2',
    [userId, articleId]
  );

  if (existing) {
    // Remove bookmark
    await execute(
      'DELETE FROM user_bookmarks WHERE user_id = $1 AND article_id = $2',
      [userId, articleId]
    );
    res.json(successResponse({ bookmarked: false }));
  } else {
    // Add bookmark
    await execute(
      'INSERT INTO user_bookmarks (user_id, article_id, bookmarked_at) VALUES ($1, $2, NOW())',
      [userId, articleId]
    );
    res.json(successResponse({ bookmarked: true }));
  }
}));

// ── GET /bookmarks/:userId — User's bookmarked articles ─────────────

router.get('/bookmarks/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  const bookmarks = await query<ContentArticle & { bookmarked_at: string }>(
    `SELECT ca.id, ca.title, ca.summary, ca.category, ca.read_time_min,
            ca.xp_reward, ca.cover_emoji, ca.difficulty, ca.tags, ca.created_at,
            ub.bookmarked_at
     FROM user_bookmarks ub
     JOIN content_articles ca ON ca.id = ub.article_id AND ca.is_published = true
     WHERE ub.user_id = $1
     ORDER BY ub.bookmarked_at DESC`,
    [userId]
  );

  res.json(successResponse({ bookmarks }));
}));

// ── GET /progress/:userId — User's reading progress & stats ─────────

router.get('/progress/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  // Reading history with article details
  const history = await query<UserContentProgress & { title: string; category: string; cover_emoji: string | null }>(
    `SELECT ucp.user_id, ucp.article_id, ucp.read_at, ucp.quiz_score, ucp.xp_earned,
            ca.title, ca.category, ca.cover_emoji
     FROM user_content_progress ucp
     JOIN content_articles ca ON ca.id = ucp.article_id
     WHERE ucp.user_id = $1
     ORDER BY ucp.read_at DESC`,
    [userId]
  );

  // Aggregated stats
  const stats = await queryOne<{
    total_articles_read: string;
    total_xp_earned: string;
    avg_quiz_score: string | null;
  }>(
    `SELECT COUNT(*) AS total_articles_read,
            COALESCE(SUM(xp_earned), 0) AS total_xp_earned,
            ROUND(AVG(quiz_score)) AS avg_quiz_score
     FROM user_content_progress
     WHERE user_id = $1`,
    [userId]
  );

  // Favorite category (most articles read in)
  const favoriteCategory = await queryOne<{ category: string; count: string }>(
    `SELECT ca.category, COUNT(*) AS count
     FROM user_content_progress ucp
     JOIN content_articles ca ON ca.id = ucp.article_id
     WHERE ucp.user_id = $1
     GROUP BY ca.category
     ORDER BY count DESC
     LIMIT 1`,
    [userId]
  );

  res.json(successResponse({
    history,
    stats: {
      total_articles_read: parseInt(stats?.total_articles_read || '0', 10),
      total_xp_earned: parseInt(stats?.total_xp_earned || '0', 10),
      avg_quiz_score: stats?.avg_quiz_score ? parseInt(stats.avg_quiz_score, 10) : null,
      favorite_category: favoriteCategory?.category ?? null,
    },
  }));
}));

export { router as contentRouter };
