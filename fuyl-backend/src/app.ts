import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { logger } from './config/logger';
import { apiLimiter } from './shared/middleware/rateLimit.middleware';
import { notFoundMiddleware, errorMiddleware } from './shared/middleware/error.middleware';
import apiRouter from './routes';

// Swagger spec
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: env.appName,
      version: '1.0.0',
      description: 'Fuyl — E-commerce Operating System API. Includes Subscription & Refer-and-Earn modules.',
    },
    servers: [{ url: `/${env.apiPrefix}` }],
  },
  apis: ['./src/modules/**/routes/*.ts'],
});

export function createApp() {
  const app = express();

  // Trust proxy (for correct req.ip behind a load balancer)
  app.set('trust proxy', 1);

  // Security
  app.use(helmet());
  app.use(cors({
    origin: env.clientUrl,
    credentials: true,
  }));

  // Compression
  app.use(compression());

  // ─────────────────────────────────────────────────────────────
  // RAW BODY capture for Razorpay webhook route
  // ─────────────────────────────────────────────────────────────
  app.use(
    `/${env.apiPrefix}/webhooks/razorpay/subscription`,
    express.raw({ type: 'application/json' }),
    (req: Request, _res: Response, next: NextFunction) => {
      if (Buffer.isBuffer(req.body)) {
        // Re-inject as string for the webhook handler
        (req as any).rawBody = req.body.toString('utf8');
        req.body = (req as any).rawBody;
      }
      next();
    }
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate limiting
  app.use(`/${env.apiPrefix}`, apiLimiter);

  // Swagger docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // API routes
  app.use(`/${env.apiPrefix}`, apiRouter);

  // 404
  app.use(notFoundMiddleware);

  // Error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
