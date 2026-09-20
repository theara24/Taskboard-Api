import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';

export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHORIZED));
  }

  if (req.user.role !== Role.ADMIN) {
    return next(
      ApiError.forbidden(
        'Access denied: Platform Administrator privileges required',
        ErrorCode.FORBIDDEN,
      ),
    );
  }

  next();
};
