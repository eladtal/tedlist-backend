const express = require('express');
import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/auth';
import auth from '../middleware/auth';
import { getNotifications, markAsRead } from '../controllers/notificationController';
import { Notification } from '../models/Notification';

const router = express.Router();

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('../types/auth').AuthRequest} AuthRequest */

// Get all notifications for the authenticated user
router.get('/', auth, getNotifications);

// Get recent notifications (last 5) and unread count
router.get('/recent', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('fromUser', 'name avatar')
        .populate('item', 'title images description condition'),
      Notification.countDocuments({ user: req.user._id, read: false })
    ]);

    console.log('Found recent notifications:', {
      count: notifications.length,
      unreadCount,
      userId: req.user._id
    });

    // Transform the response to match frontend expectations
    const transformedNotifications = notifications.map(notification => ({
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt,
      fromUser: notification.fromUser,
      item: notification.item
    }));

    res.json({
      success: true,
      notifications: transformedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching recent notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching recent notifications' 
    });
  }
});

// Mark a notification as read
router.post('/:notificationId/read', auth, markAsRead);

// Mark all notifications as read
router.post('/mark-all-read', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );

    console.log('Marked all notifications as read:', {
      userId: req.user._id,
      modifiedCount: result.modifiedCount
    });

    // Get updated notifications
    const updatedNotifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('fromUser', 'name avatar')
      .populate('item', 'title images description condition');

    const transformedNotifications = updatedNotifications.map(notification => ({
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt,
      fromUser: notification.fromUser,
      item: notification.item
    }));

    res.json({
      success: true,
      message: 'All notifications marked as read',
      notifications: transformedNotifications,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating notifications' 
    });
  }
});

export default router; 