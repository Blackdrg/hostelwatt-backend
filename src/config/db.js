const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

let mongoMemoryServer = null;

const DEFAULT_ATLAS_URI = 'mongodb+srv://daredevil0101a_db_user:fA77MnVvpM9PnfSe@cluster0.tt5f6th.mongodb.net/hostelwatt?retryWrites=true&w=majority';

const connectDB = async () => {
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.DATABASE_URL || DEFAULT_ATLAS_URI;
  
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(`[Database] Connected to MongoDB at: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  } catch (err) {
    console.warn(`[Database] Failed to connect to ${uri}: ${err.message}`);
    
    console.log(`[Database] Attempting embedded in-memory MongoDB fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'hostelwatt' }
      });
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[Database] Successfully connected to In-Memory MongoDB at: ${memUri}`);
    } catch (memErr) {
      console.error(`[Database] In-memory MongoDB failed: ${memErr.message}`);
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
