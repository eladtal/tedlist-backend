import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types/auth';
import { IItem } from './Item';

export interface INotification extends Document {
  type: 'offer' | 'match' | 'message' | 'system';
  title: string;
  message: string;
  user: IUser['_id'];
  fromUser?: IUser['_id'];
  item?: IItem['_id'];
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema({
  type: {
    type: String,
    enum: ['offer', 'match', 'message', 'system'],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be longer than 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot be longer than 500 characters']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  fromUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  item: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for querying unread notifications
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// Middleware to validate references before saving
notificationSchema.pre('save', async function(next) {
  try {
    const User = mongoose.model('User');
    const Item = mongoose.model('Item');

    // Validate user reference
    const userExists = await User.exists({ _id: this.user });
    if (!userExists) {
      throw new Error('Referenced user does not exist');
    }

    // Validate fromUser reference if present
    if (this.fromUser) {
      const fromUserExists = await User.exists({ _id: this.fromUser });
      if (!fromUserExists) {
        throw new Error('Referenced fromUser does not exist');
      }
    }

    // Validate item reference if present
    if (this.item) {
      const itemExists = await Item.exists({ _id: this.item });
      if (!itemExists) {
        throw new Error('Referenced item does not exist');
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Static method to create a notification with validation
notificationSchema.statics.createNotification = async function(notificationData: Partial<INotification>) {
  const notification = new this(notificationData);
  await notification.validate();
  return notification.save();
};

// Method to mark notification as read
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  return this.save();
};

export const Notification = mongoose.model<INotification>('Notification', notificationSchema); 