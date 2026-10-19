const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

// Connect to MongoDB Database
connectDB()
  .then(() => {
    // Bind to 0.0.0.0 for containerized and cloud platforms (Render, Docker, AWS)
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`  TrustVault Backend running on http://0.0.0.0:${config.port}`);
      console.log(`  Environment: ${config.nodeEnv}`);
      console.log(`  Storage Vault: ${config.storageDir}`);
      console.log(`=======================================================`);
    });

    // Graceful Shutdown Handlers
    const handleShutdown = async (signal) => {
      console.log(`\n[TrustVault] Received ${signal}. Commencing graceful shutdown...`);
      server.close(async () => {
        console.log('[TrustVault] HTTP server closed.');
        await disconnectDB();
        process.exit(0);
      });

      // Force shutdown after 10 seconds if lingering connections persist
      setTimeout(() => {
        console.error('[TrustVault] Forceful shutdown initiated due to timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Fatal initialization error:', err.message);
    process.exit(1);
  });
