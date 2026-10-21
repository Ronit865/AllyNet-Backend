import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config();

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      avatar: String,
      isVerified: Boolean,
      banStatus: String,
      reportCount: Number
    }));

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin already exists:', existingAdmin.email);
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@gmail.com',
      password: hashedPassword,
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
      isVerified: true,
      banStatus: 'active',
      reportCount: 0
    });

    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: Admin@123');
    console.log('👤 Role:', admin.role);
    console.log('🆔 ID:', admin._id);

    await mongoose.disconnect();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
