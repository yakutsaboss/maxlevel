import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so the variable is available inside the hoisted vi.mock factory
const { mockAxiosInstance } = vi.hoisted(() => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { mockAxiosInstance: instance };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

// Import after mock so the module gets the mocked axios
import { apiClient } from '@/api/client';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.clearCache();
  });

  it('makes a GET request and returns data', async () => {
    const mockData = { success: true, data: { level: 5, xp: 100 } };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

    const result = await apiClient.getUserStats(12345);

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/users/12345/stats',
      expect.objectContaining({ timeout: 5000 })
    );
    expect(result).toEqual(mockData);
  });

  it('makes a POST request and returns response data', async () => {
    const mockResponse = { success: true, data: { message: 'User created', user: { id: 1 } } };
    mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await apiClient.createUser({
      telegram_id: 12345,
      first_name: 'Test',
    });

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users', {
      telegram_id: 12345,
      first_name: 'Test',
    });
    expect(result).toEqual(mockResponse);
  });

  it('deduplicates concurrent GET requests with same params', async () => {
    let resolveGet!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => { resolveGet = resolve; });
    mockAxiosInstance.get.mockReturnValueOnce(pendingPromise);

    // Fire two concurrent requests for the same resource
    const promise1 = apiClient.getUserStats(12345);
    const promise2 = apiClient.getUserStats(12345);

    // Only one actual HTTP call should be made
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

    // Both should resolve to the same value
    const mockData = { success: true, data: { level: 1 } };
    resolveGet({ data: mockData });

    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toEqual(mockData);
    expect(result2).toEqual(mockData);
  });

  it('clearCache allows a fresh request after invalidation', async () => {
    let resolveFirst!: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
    mockAxiosInstance.get.mockReturnValueOnce(firstPromise);

    const p1 = apiClient.getUserStats(99);

    // Clear in-flight cache before first resolves
    apiClient.clearCache();

    // Second call should trigger a new HTTP request
    const secondData = { success: true, data: { level: 2 } };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: secondData });
    const p2 = apiClient.getUserStats(99);

    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);

    // Resolve first (orphaned, but won't throw)
    resolveFirst({ data: { success: true, data: { level: 1 } } });

    const result2 = await p2;
    expect(result2).toEqual(secondData);
  });

  it('rejects with error when response interceptor propagates failure', async () => {
    const error = new Error('Server error');
    mockAxiosInstance.get.mockRejectedValueOnce(error);

    await expect(apiClient.getUserStats(12345)).rejects.toThrow();
  });

  it('treats same params as same cache key for deduplication', async () => {
    const mockData = { success: true, data: [{ id: 1 }] };
    let resolveGet!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => { resolveGet = resolve; });
    mockAxiosInstance.get.mockReturnValueOnce(pendingPromise);

    // Call getLeaderboard twice with same limit — should dedup
    const p1 = apiClient.getLeaderboard(10);
    const p2 = apiClient.getLeaderboard(10);

    // Only one HTTP call despite two requests
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

    resolveGet({ data: mockData });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(mockData);
    expect(r2).toEqual(mockData);
  });
});
