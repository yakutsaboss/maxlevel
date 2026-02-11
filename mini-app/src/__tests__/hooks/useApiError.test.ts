import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '@/hooks/useApiError';
import { ApiError } from '@/types/errors';

describe('getErrorMessage', () => {
  it('returns "No internet connection" for ApiError with code 0', () => {
    const error = new ApiError('Network failure', 0, true);
    expect(getErrorMessage(error)).toBe('No internet connection');
  });

  it('returns "Session expired" for ApiError with code 401', () => {
    const error = new ApiError('Unauthorized', 401, false);
    expect(getErrorMessage(error)).toBe('Session expired');
  });

  it('returns "Server error, try again" for ApiError with code 500', () => {
    const error = new ApiError('Internal Server Error', 500, true);
    expect(getErrorMessage(error)).toBe('Server error, try again');
  });

  it('returns generic message for non-ApiError', () => {
    expect(getErrorMessage(new Error('random'))).toBe('Something went wrong');
    expect(getErrorMessage('string error')).toBe('Something went wrong');
    expect(getErrorMessage(null)).toBe('Something went wrong');
  });
});
