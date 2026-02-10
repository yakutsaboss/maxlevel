export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Shared fetch wrapper for admin API calls.
 * Auto-adds Authorization and Content-Type headers.
 * Returns the raw Response object for callers to handle status codes.
 */
export async function adminFetch(
  path: string,
  credentials: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(`${API_BASE_URL}/admin${path}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}
