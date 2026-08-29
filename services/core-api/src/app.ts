import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { catalogRouter } from './modules/catalog/catalog.router.js';
import { ordersRouter } from './modules/orders/orders.router.js';
import { paymentsRouter } from './modules/payments/payments.router.js';

export function createApp(): Express {
  const app = express();

  // Global Middlewares
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  // Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: '@sellfastbuyfast/core-api',
      version: '1.0.0'
    });
  });

  // REST API Routes
  app.use('/v1/catalog', catalogRouter);
  app.use('/v1/orders', ordersRouter);
  app.use('/v1/payments', paymentsRouter);

  return app;
}
