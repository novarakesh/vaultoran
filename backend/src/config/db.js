const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async (uri = config.mongodbUri) => {
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: config.nodeEnv !== 'production',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    console.log(`[TrustVault Database] Connected to MongoDB: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[TrustVault Database] Connection Error: ${error.message}`);
    if (config.nodeEnv !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[TrustVault Database] MongoDB connection closed.');
  } catch (error) {
    console.error(`[TrustVault Database] Disconnect Error: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
