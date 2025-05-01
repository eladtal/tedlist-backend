import mongoose from 'mongoose';
import { User } from '../models/User';
import { config } from '../config';

async function listUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find().select('name email isAdmin');
    console.log('Users:', users);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listUsers(); 