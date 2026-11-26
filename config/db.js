const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI environment variable.
 */
async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure_connect';

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[db] Connection error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
