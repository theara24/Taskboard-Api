import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';

export const authorizeRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: requires one of the following roles: ${allowedRoles.join(', ')}`,
          ErrorCode.FORBIDDEN,
        ),
      );
    }

    next();
  };
};
