import { Response } from 'express';
import { AuthRequest } from '../types/auth';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { connectedUsers } from '../server';
import mongoose from 'mongoose';
import WebSocket from 'ws';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('Fetching notifications for user:', req.user._id);
    const notifications = await Notification.find({ user: req.user._id })
      .populate('fromUser', 'name avatar')
      .populate('item', 'title images description condition')
      .sort({ createdAt: -1 });

    console.log('Found notifications:', notifications.length);
    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { notificationId } = req.params;
    console.log('Marking notification as read:', notificationId);
    await Notification.findByIdAndUpdate(notificationId, { read: true });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification', error });
  }
};

export const createNotification = async (userId: string, type: 'offer' | 'match' | 'message' | 'system', itemId: string, fromUserId: string, message: string) => {
  try {
    console.log('Creating notification:', {
      userId,
      type,
      itemId,
      fromUserId,
      message
    });

    // Verify user and item exist
    const [user, fromUser, item] = await Promise.all([
      User.findById(userId),
      User.findById(fromUserId),
      mongoose.model('Item').findById(itemId)
    ]);

    if (!user || !fromUser) {
      console.error('Failed to create notification: User not found', { user, fromUser });
      throw new Error('User not found');
    }

    // Generate title based on notification type
    let title = '';
    switch (type) {
      case 'offer':
        title = 'New Trade Offer';
        break;
      case 'match':
        title = 'New Match!';
        break;
      case 'message':
        title = 'New Message';
        break;
      case 'system':
        title = 'System Notification';
        break;
    }

    const notification = new Notification({
      user: userId,
      type,
      title,
      item: itemId,
      fromUser: fromUserId,
      message,
      read: false
    });

    const savedNotification = await notification.save();
    
    // Populate the notification with user and item details
    const populatedNotification = await Notification.findById(savedNotification._id)
      .populate('fromUser', 'name avatar')
      .populate('item', 'title images description condition');

    if (!populatedNotification) {
      throw new Error('Failed to populate notification');
    }

    // Transform notification for frontend
    const transformedNotification = {
      _id: populatedNotification._id.toString(),
      type: populatedNotification.type,
      title: populatedNotification.title,
      message: populatedNotification.message,
      read: populatedNotification.read,
      createdAt: populatedNotification.createdAt,
      updatedAt: populatedNotification.updatedAt,
      fromUser: populatedNotification.fromUser,
      item: populatedNotification.item
    };

    // Send real-time notification if user is connected
    const userData = connectedUsers.get(userId);
    if (userData?.ws.readyState === WebSocket.OPEN) {
      console.log('Sending real-time notification to user:', userId);
      userData.ws.send(JSON.stringify({
        type: 'notification',
        data: transformedNotification
      }));
    } else {
      console.log('User not connected for real-time notification:', userId);
    }

    console.log('Notification created successfully:', transformedNotification);
    return transformedNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}; 