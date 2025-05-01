import { Request, Response } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDefaultAvatar } from '../utils/profileUtils';

const generateUserResponse = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || getDefaultAvatar(user.name),
  teddies: user.teddies,
  isAdmin: user.isAdmin,
  adminPrivileges: user.adminPrivileges
});

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      email,
      password: hashedPassword,
      name,
      teddies: 0,
      badges: [],
      streak: { count: 0, lastLogin: new Date() },
      onboardingProgress: 0
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is deleted
    if (user.isDeleted) {
      return res.status(401).json({ message: 'This account has been deleted' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'your-secret-key');

    // Send response
    res.json({
      token,
      user: generateUserResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const validateToken = async (req: Request, res: Response) => {
  try {
    console.log('Token validation request received');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ message: 'No token provided' });
    }

    console.log('Verifying token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    console.log('Token verified, looking up user');
    
    const user = await User.findById(decoded.userId);
    console.log('User lookup result:', user ? 'found' : 'not found');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('Token validation successful');
    res.json({ user: generateUserResponse(user) });
  } catch (error) {
    console.error('Token validation error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Server error during validation' });
  }
}; 