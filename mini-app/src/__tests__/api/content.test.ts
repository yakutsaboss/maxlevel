import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.Telegram.WebApp
Object.defineProperty(window, 'Telegram', {
  value: { WebApp: { initData: 'mock-init-data' } },
  writable: true,
});

import {
  fetchContentFeed,
  fetchArticle,
  markArticleRead,
  fetchQuiz,
  submitQuiz,
  toggleBookmark,
  fetchBookmarks,
  fetchReadingProgress,
} from '@/api/content';
import type {
  ContentArticle,
  ContentFeedResponse,
  QuizQuestion,
  QuizResult,
  ReadingProgress,
} from '@/api/content';

// --- Helpers ---

function mockJsonResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

const sampleArticle: ContentArticle = {
  id: 1,
  title: 'Test Article',
  summary: 'A brief summary',
  body_html: '<p>Content</p>',
  category: 'finance',
  read_time_min: 5,
  xp_reward: 25,
  cover_emoji: '💰',
  difficulty: 'beginner',
  tags: ['saving', 'tips'],
  is_published: true,
  created_at: '2026-01-01T00:00:00Z',
  is_read: false,
  is_bookmarked: false,
  quiz_count: 3,
};

const sampleFeedResponse: ContentFeedResponse = {
  articles: [sampleArticle],
  total: 1,
  totalPages: 1,
  page: 1,
};

const sampleQuizQuestion: QuizQuestion = {
  id: 10,
  article_id: 1,
  question: 'What is compound interest?',
  options: ['A', 'B', 'C', 'D'],
  xp_reward: 10,
};

const sampleQuizResult: QuizResult = {
  score: 80,
  total: 3,
  correct: 2,
  xp_earned: 30,
  correct_answers: [0, 2, 1],
};

const sampleProgress: ReadingProgress = {
  total_read: 10,
  total_xp_from_content: 250,
  avg_quiz_score: 75,
  reading_streak: 3,
  favorite_category: 'finance',
  articles_by_category: { finance: 5, health: 3, productivity: 2 },
};

// --- Tests ---

describe('Content API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- fetchContentFeed ----------

  describe('fetchContentFeed', () => {
    it('fetches feed with default params', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: sampleFeedResponse }));

      const result = await fetchContentFeed();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/content/feed');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=10');
      expect(url).toContain('unread_first=true');
      expect(result).toEqual(sampleFeedResponse);
    });

    it('passes category filter when not "all"', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: sampleFeedResponse }));

      await fetchContentFeed(1, 10, 'finance');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('category=finance');
    });

    it('does not pass category when "all"', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: sampleFeedResponse }));

      await fetchContentFeed(1, 10, 'all');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('category=');
    });

    it('passes custom page and limit', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: sampleFeedResponse }));

      await fetchContentFeed(3, 20, 'health');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('page=3');
      expect(url).toContain('limit=20');
      expect(url).toContain('category=health');
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ error: 'Server error' }, false, 500));

      await expect(fetchContentFeed()).rejects.toThrow('Server error');
    });

    it('throws on non-success response body', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: false, error: 'Bad request' }));

      await expect(fetchContentFeed()).rejects.toThrow('Bad request');
    });

    it('sends auth headers when Telegram initData is present', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: sampleFeedResponse }));

      await fetchContentFeed();

      const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(fetchOptions.headers).toEqual(
        expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': 'mock-init-data',
        }),
      );
    });
  });

  // ---------- fetchArticle ----------

  describe('fetchArticle', () => {
    it('fetches a single article by id', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: sampleArticle }));

      const result = await fetchArticle(42);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/content/42');
      expect(result).toEqual(sampleArticle);
    });

    it('throws on 404', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ error: 'Article not found' }, false, 404));

      await expect(fetchArticle(999)).rejects.toThrow('Article not found');
    });

    it('throws generic message when error body has no error field', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({}, false, 500));

      await expect(fetchArticle(999)).rejects.toThrow('Request failed (500)');
    });
  });

  // ---------- markArticleRead ----------

  describe('markArticleRead', () => {
    it('sends POST with telegram_id and returns xp_earned', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({ success: true, data: { xp_earned: 25 } }),
      );

      const result = await markArticleRead(1, 12345);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/content/1/read');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ telegram_id: 12345 });
      expect(result).toEqual({ xp_earned: 25 });
    });

    it('throws on failure', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({ error: 'User not found' }, false, 404),
      );

      await expect(markArticleRead(1, 0)).rejects.toThrow('User not found');
    });
  });

  // ---------- fetchQuiz ----------

  describe('fetchQuiz', () => {
    it('fetches quiz questions for an article', async () => {
      const quizData = [sampleQuizQuestion];
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: quizData }));

      const result = await fetchQuiz(1);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/content/1/quiz');
      expect(result).toEqual(quizData);
      expect(result[0].options).toHaveLength(4);
    });

    it('returns empty array when no quiz available', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: [] }));

      const result = await fetchQuiz(999);
      expect(result).toEqual([]);
    });
  });

  // ---------- submitQuiz ----------

  describe('submitQuiz', () => {
    it('submits answers and returns quiz result', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({ success: true, data: sampleQuizResult }),
      );

      const answers = [
        { question_id: 10, selected_index: 0 },
        { question_id: 11, selected_index: 2 },
        { question_id: 12, selected_index: 1 },
      ];

      const result = await submitQuiz(1, 12345, answers);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/content/1/quiz');
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body.telegram_id).toBe(12345);
      expect(body.answers).toHaveLength(3);
      expect(result.score).toBe(80);
      expect(result.xp_earned).toBe(30);
    });

    it('throws on grading failure', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({ error: 'Invalid answers' }, false, 400),
      );

      await expect(
        submitQuiz(1, 12345, [{ question_id: 10, selected_index: 5 }]),
      ).rejects.toThrow('Invalid answers');
    });
  });

  // ---------- toggleBookmark ----------

  describe('toggleBookmark', () => {
    it('toggles bookmark on and returns bookmarked:true', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({ success: true, data: { bookmarked: true } }),
      );

      const result = await toggleBookmark(1, 12345);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/content/1/bookmark');
      expect(opts.method).toBe('POST');
      expect(result.bookmarked).toBe(true);
    });

    it('toggles bookmark off and returns bookmarked:false', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({ success: true, data: { bookmarked: false } }),
      );

      const result = await toggleBookmark(1, 12345);
      expect(result.bookmarked).toBe(false);
    });

    it('throws on server error', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({ error: 'Internal error' }, false, 500),
      );

      await expect(toggleBookmark(1, 12345)).rejects.toThrow('Internal error');
    });
  });

  // ---------- fetchBookmarks ----------

  describe('fetchBookmarks', () => {
    it('fetches bookmarked articles for a user', async () => {
      const bookmarks = [sampleArticle];
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: bookmarks }));

      const result = await fetchBookmarks(42);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/content/bookmarks/42');
      expect(result).toEqual(bookmarks);
    });

    it('returns empty array when user has no bookmarks', async () => {
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: [] }));

      const result = await fetchBookmarks(42);
      expect(result).toEqual([]);
    });
  });

  // ---------- fetchReadingProgress ----------

  describe('fetchReadingProgress', () => {
    it('fetches reading progress for a user', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({ success: true, data: sampleProgress }),
      );

      const result = await fetchReadingProgress(42);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/content/progress/42');
      expect(result.total_read).toBe(10);
      expect(result.reading_streak).toBe(3);
      expect(result.favorite_category).toBe('finance');
    });

    it('includes articles_by_category breakdown', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({ success: true, data: sampleProgress }),
      );

      const result = await fetchReadingProgress(42);

      expect(result.articles_by_category).toEqual({
        finance: 5,
        health: 3,
        productivity: 2,
      });
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({}, false, 500),
      );

      await expect(fetchReadingProgress(42)).rejects.toThrow();
    });
  });

  // ---------- Edge cases ----------

  describe('edge cases', () => {
    it('handles json parse failure on error response gracefully', async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: false,
          status: 502,
          json: () => Promise.reject(new Error('Bad JSON')),
        }),
      );

      await expect(fetchArticle(1)).rejects.toThrow('Request failed (502)');
    });

    it('sends no auth header when Telegram initData is absent', async () => {
      // Temporarily clear initData
      const orig = (window as any).Telegram.WebApp.initData;
      (window as any).Telegram.WebApp.initData = '';
      mockFetch.mockReturnValueOnce(mockJsonResponse({ success: true, data: sampleFeedResponse }));

      await fetchContentFeed();

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['X-Telegram-Init-Data']).toBeUndefined();

      // Restore
      (window as any).Telegram.WebApp.initData = orig;
    });
  });
});
