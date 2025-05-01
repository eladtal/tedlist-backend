import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
import { User } from '../models/User';

// Middleware to check if user is admin
export const isAdmin = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    console.log('Checking admin status for request:', {
      path: req.path,
      method: req.method,
      user: req.user
    });

    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.user._id);
    console.log('Found user:', {
      id: user?._id,
      name: user?.name,
      isAdmin: user?.isAdmin
    });

    if (!user || !user.isAdmin) {
      console.log('User is not admin');
      return res.status(403).json({ message: 'Not authorized' });
    }

    console.log('User is admin, proceeding');
    next();
  } catch (error) {
    console.error('Error in isAdmin middleware:', error);
    res.status(500).json({ message: 'Error checking admin status' });
  }
};

// Get all users
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Getting all users');
    const users = await User.find().select('-password');
    console.log('Found users:', users.length);
    res.json(users);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Make a user admin
export const makeAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { privileges } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isAdmin: true,
        adminPrivileges: privileges || ['manage_users', 'manage_items', 'manage_trades']
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user admin status' });
  }
};

// Remove admin privileges
export const removeAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isAdmin: false,
        adminPrivileges: []
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error removing admin privileges' });
  }
};

// Update admin privileges
export const updateAdminPrivileges = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { privileges } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { adminPrivileges: privileges },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating admin privileges' });
  }
};

// Delete a user (soft delete)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if trying to delete self
    if (userId === req.user?._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isDeleted: true,
        deletedAt: new Date(),
        // Keep the data but invalidate login
        password: 'DELETED_USER_' + Date.now(),
        email: `deleted_${Date.now()}_${userId}@deleted.user`
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
}; 