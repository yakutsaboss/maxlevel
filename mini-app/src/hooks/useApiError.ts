import { ApiError } from '@/types/errors';

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 0) return 'No internet connection';
    if (error.code === 401) return 'Session expired';
    if (error.code === 403) return 'Access denied';
    if (error.code === 404) return 'Data not found';
    if (error.code >= 500) return 'Server error, try again';
    return error.message;
  }
  return 'Something went wrong';
}
