import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config from './config/env.js';
import { checkConnection } from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api', academicRoutes);
  app.use('/api', announcementRoutes);
  app.use('/api/gallery', galleryRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api', dashboardRoutes);
  app.use('/api', auditLogRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;