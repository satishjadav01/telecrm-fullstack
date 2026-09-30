const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const prisma = require('./config/db');

const { initShopifyCron } = require('./modules/integrations/shopify.cron');
const { initRecordingsCron } = require('./modules/recordings/recordings.cron');

const server = app.listen(env.port, env.host, () => {
  logger.info({ host: env.host, port: env.port }, 'Backend running');
  
  // Initialize cron jobs
  try {
    initShopifyCron();
  } catch (err) {
    logger.error({ error: err.message }, 'Failed to initialize Shopify cron');
  }

  try {
    initRecordingsCron();
  } catch (err) {
    logger.error({ error: err.message }, 'Failed to initialize recordings cron');
  }
});

const shutdown = async () => {
  logger.info('Shutting down server...');
  server.close(async (error) => {
    if (error) {
      logger.error({ error }, 'Failed to close server cleanly');
      process.exit(1);
      return;
    }

    await prisma.$disconnect();
    logger.info('Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  shutdown();
});
