import type { AxiosError } from 'axios';

export class ApiError extends Error {
  readonly code: number;
  readonly retryable: boolean;
  readonly originalError: unknown;

  constructor(message: string, code: number, retryable: boolean, originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
    this.originalError = originalError;
  }

  static fromAxios(error: AxiosError): ApiError {
    // Network error (no response received)
    if (!error.response) {
      return new ApiError(
        error.message || 'Network error',
        0,
        true,
        error
      );
    }

    const status = error.response.status;
    const data = error.response.data as { error?: string; message?: string } | undefined;
    const message = data?.error || data?.message || error.message || `Request failed with status ${status}`;

    // 5xx server errors are retryable
    if (status >= 500) {
      return new ApiError(message, status, true, error);
    }

    // 4xx client errors are not retryable
    return new ApiError(message, status, false, error);
  }
}
