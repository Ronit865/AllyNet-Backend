import dns from 'node:dns';
import mongo from 'mongoose';

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    await mongo.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully✅');
  } catch (error) {
    console.error('MongoDB connection failed❌:', error);
    process.exit(1);
  }
}

export default connectDB;