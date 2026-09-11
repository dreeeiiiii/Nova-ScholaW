import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import config from './config/env.js';
import { checkConnection } from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';

const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.all('/api/health', async (req, res) => {
    let database = 'connected';
    try {
      await checkConnection();
    } catch (err) {
      database = 'disconnected';
      console.error('[health] database check failed:', err.message);
    }

    res.json({
      status: 'ok',
      service: 'novaschola-server',
      environment: config.nodeEnv,
      database,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;