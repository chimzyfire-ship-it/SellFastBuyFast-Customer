import express, { ErrorRequestHandler, Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { catalogRouter } from './modules/catalog/catalog.router.js';
import { ordersRouter } from './modules/orders/orders.router.js';
import { paymentsRouter } from './modules/payments/payments.router.js';
import { fulfilmentRouter } from './modules/fulfilment/fulfilment.router.js';
import { payoutsRouter } from './modules/payouts/payouts.router.js';
import { customerCareRouter } from './modules/customer-care/customerCare.router.js';
import { notificationsRouter } from './modules/notifications/notifications.router.js';
import { catalogManagementRouter } from './modules/catalog-management/catalogManagement.router.js';
import { vendorRouter } from './modules/vendor/vendor.router.js';
import { config } from './lib/config.js';
import { sendError } from './lib/errors.js';
import { rateLimit } from './middleware/rateLimit.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || !config.isProduction || configuredOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: false,
  }));
  app.use(express.json({
    limit: '1mb',
    verify(req, _res, buffer) {
      if ((req as Request).originalUrl.startsWith('/v1/payments/webhook/paystack')) {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      }
    },
  }));
  app.use(morgan(config.isProduction ? 'combined' : 'dev'));
  app.use(rateLimit({ windowMs: 60_000, max: 300 }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: '@sellfastbuyfast/core-api',
      version: '1.0.0',
    });
  });

  app.use('/v1/catalog', catalogRouter);
  app.use('/v1/orders', ordersRouter);
  app.use('/v1/payments', paymentsRouter);
  app.use('/v1/fulfilment', fulfilmentRouter);
  app.use('/v1/payouts', payoutsRouter);
  app.use('/v1/customer-care', customerCareRouter);
  app.use('/v1/notifications', notificationsRouter);
  app.use('/v1/catalog-management', catalogManagementRouter);
  app.use('/v1/vendor', vendorRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    sendError(res, err);
  };
  app.use(errorHandler);
  return app;
}
