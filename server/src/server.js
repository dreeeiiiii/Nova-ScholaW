import config from './shared/config/env.js';
import { closePool } from './shared/config/db.js';
import createApp from './app.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[server] Nova Schola API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});

// Graceful shutdown: stop accepting connections, then close the DB pool.
const shutdown = (signal) => {
  console.log(`[server] Received ${signal} — shutting down gracefully…`);
  server.close(async () => {
    try {
      await closePool();
      console.log('[server] DB pool closed. Exiting.');
      process.exit(0);
    } catch (err) {
      console.error('[server] Error closing DB pool:', err.message);
      process.exit(1);
    }
  });
  // Force-exit if connections don't drain within 10s.
  setTimeout(() => {
    console.error('[server] Graceful shutdown timed out — forcing exit.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));