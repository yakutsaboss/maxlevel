import { Request, Response, NextFunction } from 'express';

/**
 * Custom error classes for API
 */

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500);
  }
}

/**
 * Async handler wrapper to catch errors in async routes
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Success response formatter
 */
export const successResponse = (data: any, message?: string): { success: true; data: any; message?: string } => {
  return {
    success: true,
    ...(message && { message }),
    data,
  };
};

/**
 * Validation helper
 */
export const validateRequired = (fields: { [key: string]: any }, fieldNames: string[]) => {
  const missing: string[] = [];

  for (const fieldName of fieldNames) {
    if (!fields[fieldName]) {
      missing.push(fieldName);
    }
  }

  if (missing.length > 0) {
    throw new BadRequestError(`Missing required fields: ${missing.join(', ')}`);
  }
};
