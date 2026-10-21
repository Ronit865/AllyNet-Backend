import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config();

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const updateAdminPassword = async () => {
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

    // Find admin
    const admin = await User.findOne({ email: 'admin@gmail.com' });
    
    if (!admin) {
      console.log('❌ Admin not found');
      await mongoose.disconnect();
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Update password
    admin.password = hashedPassword;
    await admin.save();

    console.log('🎉 Admin password updated successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 New Password: Admin@123');
    console.log('👤 Role:', admin.role);

    await mongoose.disconnect();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
    process.exit(1);
  }
};

updateAdminPassword();
