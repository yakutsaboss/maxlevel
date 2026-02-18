/**
 * Content API client — fetches articles, quizzes, bookmarks, and reading progress.
 * Follows the same standalone-fetch pattern as activities.ts / inventory.ts.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  return initData
    ? { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData }
    : { 'Content-Type': 'application/json' };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || json.message || 'Request failed');
  }

  return json.data;
}

// --- Types ---

export interface ContentArticle {
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
  is_read?: boolean;
  is_bookmarked?: boolean;
  quiz_count?: number;
}

export interface ContentFeedResponse {
  articles: ContentArticle[];
  total: number;
  totalPages: number;
  page: number;
}

export interface QuizQuestion {
  id: number;
  article_id: number;
  question: string;
  options: string[];
  xp_reward: number;
}

export interface QuizAnswer {
  question_id: number;
  selected_index: number;
}

export interface QuizResult {
  score: number;
  total: number;
  correct: number;
  xp_earned: number;
  correct_answers: number[];
}

export interface ReadingProgress {
  total_read: number;
  total_xp_from_content: number;
  avg_quiz_score: number | null;
  reading_streak: number;
  favorite_category: string | null;
  articles_by_category: Record<string, number>;
}

// --- API Functions ---

/**
 * GET /content/feed — Paginated content feed with optional category filter.
 */
export async function fetchContentFeed(
  page = 1,
  limit = 10,
  category?: string,
): Promise<ContentFeedResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category && category !== 'all') params.set('category', category);
  params.set('unread_first', 'true');
  return request<ContentFeedResponse>(`${API_BASE_URL}/content/feed?${params}`);
}

/**
 * GET /content/:articleId — Single article detail.
 */
export async function fetchArticle(articleId: number): Promise<ContentArticle> {
  return request<ContentArticle>(`${API_BASE_URL}/content/${articleId}`);
}

/**
 * POST /content/:articleId/read — Mark article as read + award XP.
 */
export async function markArticleRead(
  articleId: number,
  telegramId: number,
): Promise<{ xp_earned: number }> {
  return request<{ xp_earned: number }>(`${API_BASE_URL}/content/${articleId}/read`, {
    method: 'POST',
    body: JSON.stringify({ telegram_id: telegramId }),
  });
}

/**
 * GET /content/:articleId/quiz — Get quiz questions (without answers).
 */
export async function fetchQuiz(articleId: number): Promise<QuizQuestion[]> {
  return request<QuizQuestion[]>(`${API_BASE_URL}/content/${articleId}/quiz`);
}

/**
 * POST /content/:articleId/quiz — Submit quiz answers.
 */
export async function submitQuiz(
  articleId: number,
  telegramId: number,
  answers: QuizAnswer[],
): Promise<QuizResult> {
  return request<QuizResult>(`${API_BASE_URL}/content/${articleId}/quiz`, {
    method: 'POST',
    body: JSON.stringify({ telegram_id: telegramId, answers }),
  });
}

/**
 * POST /content/:articleId/bookmark — Toggle bookmark.
 */
export async function toggleBookmark(
  articleId: number,
  telegramId: number,
): Promise<{ bookmarked: boolean }> {
  return request<{ bookmarked: boolean }>(`${API_BASE_URL}/content/${articleId}/bookmark`, {
    method: 'POST',
    body: JSON.stringify({ telegram_id: telegramId }),
  });
}

/**
 * GET /content/bookmarks/:userId — User's bookmarked articles.
 */
export async function fetchBookmarks(userId: number): Promise<ContentArticle[]> {
  return request<ContentArticle[]>(`${API_BASE_URL}/content/bookmarks/${userId}`);
}

/**
 * GET /content/progress/:userId — Reading stats.
 */
export async function fetchReadingProgress(userId: number): Promise<ReadingProgress> {
  return request<ReadingProgress>(`${API_BASE_URL}/content/progress/${userId}`);
}
