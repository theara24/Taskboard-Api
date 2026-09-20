import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  // 1. Handled ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.errorCode,
      ...(err.details ? { details: err.details } : {}),
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
  }

  // 2. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[]).join(', ')
        : 'field';
      return res.status(409).json({
        success: false,
        message: `Unique constraint failed on ${target}`,
        error: ErrorCode.VALIDATION_ERROR,
      });
    }

    // Record to update/delete not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'The requested record was not found',
        error: ErrorCode.NOT_FOUND,
      });
    }

    // Foreign key constraint violation
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Foreign key constraint violated',
        error: ErrorCode.VALIDATION_ERROR,
      });
    }
  }

  // 3. Fallback for unhandled/unexpected errors
  console.error('Unhandled Server Error:', err);

  return res.status(500).json({
    success: false,
    message: 'Internal server error occurred',
    error: ErrorCode.INTERNAL_SERVER_ERROR,
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
