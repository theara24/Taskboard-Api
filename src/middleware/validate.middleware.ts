import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects, ZodError } from 'zod';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Validatable = AnyZodObject | ZodEffects<any>;

export interface ValidationSchema {
  body?: Validatable;
  query?: Validatable;
  params?: Validatable;
}

export const validate = (schema: ValidationSchema | Validatable) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if ('parseAsync' in schema) {
        // Schema is a ZodObject containing { body, query, params }
        const parsed = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      } else {
        if (schema.body) {
          req.body = await schema.body.parseAsync(req.body);
        }
        if (schema.query) {
          req.query = await schema.query.parseAsync(req.query);
        }
        if (schema.params) {
          req.params = await schema.params.parseAsync(req.params);
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.').replace(/^(body|query|params)\./, ''),
          message: err.message,
        }));
        next(new ApiError(400, 'Validation failed', ErrorCode.VALIDATION_ERROR, details));
      } else {
        next(error);
      }
    }
  };
};
