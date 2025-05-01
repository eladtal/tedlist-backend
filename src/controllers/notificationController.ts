import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { connectedUsers } from '../server';
import mongoose from 'mongoose';
import WebSocket from 'ws';

// Get all notifications for the authenticated user
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('fromUser', 'name avatar')
      .populate('item', 'title images description condition');

    // Transform notifications to match frontend expectations
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
      notifications: transformedNotifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching notifications' 
    });
  }
};

// Mark a notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.body;
    
    if (!notificationId) {
      return res.status(400).json({ 
        success: false,
        message: 'Notification ID is required' 
      });
    }

    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user._id },
      { read: true },
      { new: true }
    ).populate('fromUser', 'name avatar')
      .populate('item', 'title images description condition');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Transform notification to match frontend expectations
    const transformedNotification = {
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt,
      fromUser: notification.fromUser,
      item: notification.item
    };

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification: transformedNotification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating notification' 
    });
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