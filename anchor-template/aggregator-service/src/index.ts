import express from 'express';
import { initSchema, writeAuditLog } from './db.js';
import { PORT } from './config.js';
import { sdkRouter } from './sdk.js';
import { startBackgroundWorkers, stopBackgroundWorkers } from './workers.js';

const app = express();

app.use(express.json());

// Log every incoming request for observability
app.use((req, _res, next) => {
  console.log(`[aggregator] ${req.method} ${req.url}`);
  next();
});

// Mount SDK APIs
app.use('/', sdkRouter);

// Start Server
async function start() {
  try {
    // 1. Init Database Schema & Default Seeds
    await initSchema();
    
    // 2. Start Background Polling & Cleanup Workers
    startBackgroundWorkers();
    
    // 3. Listen for clients
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[aggregator] Aggregator Service listening on port ${PORT}`);
      writeAuditLog('service.started', `NordStern Aggregator Service launched on port ${PORT}`);
    });

    const shutdown = () => {
      console.log('[aggregator] shutting down...');
      stopBackgroundWorkers();
      server.close(() => {
        console.log('[aggregator] server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error('[aggregator] failed to start service:', err);
    process.exit(1);
  }
}

// Helper re-export of PORT since it's imported from db in typescript files by mistake
export { PORT } from './config.js';

start();
