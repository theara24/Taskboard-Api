import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { ErrorCode } from '../constants/error-codes';

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
      error: ErrorCode.RATE_LIMIT_EXCEEDED,
    });
  },
});
