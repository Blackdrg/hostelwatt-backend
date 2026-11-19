const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  // Railway provides MONGO_URL; also support MONGODB_URI and DATABASE_URL
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/hostelwatt';
  
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[Database] Connected to MongoDB at: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  } catch (err) {
    console.warn(`[Database] Failed to connect to ${uri}: ${err.message}`);
    
    // In-memory fallback only in development
    if (process.env.NODE_ENV === 'production') {
      console.error(`[Database] Fatal: No MongoDB available in production. Set MONGO_URL or MONGODB_URI.`);
      process.exit(1);
    }
    
    console.log(`[Database] Starting embedded in-memory MongoDB fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'hostelwatt' }
      });
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[Database] Successfully connected to In-Memory MongoDB at: ${memUri}`);
    } catch (memErr) {
      console.error(`[Database] Fatal Error connecting to MongoDB:`, memErr);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
