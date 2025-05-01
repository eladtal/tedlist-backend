import mongoose from 'mongoose';
import { User } from '../models/User';
import { config } from '../config';

async function makeUserAdmin(email: string) {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found');
      return;
    }

    // Update user to be admin
    user.isAdmin = true;
    user.adminPrivileges = ['manage_users', 'manage_items', 'manage_trades'];
    await user.save();

    console.log(`User ${email} is now an admin`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Make the "err" user an admin
makeUserAdmin('err@err.err'); 