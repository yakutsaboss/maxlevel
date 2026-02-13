import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminFetch, API_BASE_URL } from '@/api/adminClient';

describe('adminClient', () => {
  const mockCredentials = btoa('admin:password123');

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs URL with /admin prefix and given path', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    await adminFetch('/users', mockCredentials);

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/admin/users`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Basic ${mockCredentials}`,
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('sets Authorization header with Basic credentials', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    await adminFetch('/stats', mockCredentials);

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers['Authorization']).toBe(`Basic ${mockCredentials}`);
  });

  it('passes through custom RequestInit options', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    await adminFetch('/broadcast', mockCredentials, {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
    });

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].body).toBe(JSON.stringify({ message: 'hello' }));
  });

  it('returns the raw Response object', async () => {
    const mockResponse = new Response(JSON.stringify({ users: [] }), { status: 200 });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    const result = await adminFetch('/users', mockCredentials);

    expect(result).toBe(mockResponse);
    expect(result).toBeInstanceOf(Response);
  });

  it('propagates fetch errors', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    await expect(adminFetch('/users', mockCredentials)).rejects.toThrow('Network error');
  });
});
