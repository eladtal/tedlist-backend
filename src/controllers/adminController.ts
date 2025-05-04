import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
import { User } from '../models/User';
import { Item } from '../models/Item';
import fs from 'fs';
import path from 'path';

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

// Delete all items from a user
export const deleteAllUserItems = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Find all items from the user
    const items = await Item.find({ userId });

    // Get the uploads directory path
    const uploadsPath = process.env.NODE_ENV === 'production'
      ? '/opt/render/project/src/uploads'
      : path.join(__dirname, '../../uploads');

    // Delete all images from the items
    for (const item of items) {
      if (item.images && Array.isArray(item.images)) {
        for (const imagePath of item.images) {
          try {
            // Get the filename from the path
            const filename = imagePath.split('/').pop();
            if (filename) {
              const fullPath = path.join(uploadsPath, filename);
              // Check if file exists before attempting to delete
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`Deleted image: ${fullPath}`);
              }
            }
          } catch (error) {
            console.error(`Error deleting image ${imagePath}:`, error);
            // Continue with other images even if one fails
          }
        }
      }
    }

    // Delete all items from the database
    await Item.deleteMany({ userId });

    res.json({ 
      success: true,
      message: `Successfully deleted ${items.length} items and their associated images for user ${userId}`
    });
  } catch (error) {
    console.error('Error in deleteAllUserItems:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting user items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 