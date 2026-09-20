import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { setupSwagger } from './config/swagger';
import { ApiError } from './utils/api-error';
import { ErrorCode } from './constants/error-codes';

const app: Application = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// Body Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging (disabled during automated tests to avoid noisy output)
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Swagger API Documentation
setupSwagger(app);

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'TaskBoard API',
  });
});

// API Routes
app.use('/api/v1', routes);

// Handle 404 - Not Found
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound('Requested API route does not exist', ErrorCode.NOT_FOUND));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
