import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types/user';

interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = mongoose.Model<IUser, {}, UserMethods>;

const userSchema = new Schema<IUser, UserModel, UserMethods>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    teddies: {
      type: Number,
      default: 0,
    },
    badges: {
      type: [String],
      default: [],
    },
    streak: {
      count: {
        type: Number,
        default: 0,
      },
      lastLogin: {
        type: Date,
        default: null,
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    adminPrivileges: {
      type: [String],
      default: [],
    },
    onboardingProgress: {
      type: Number,
      default: 0,
    },
    quests: [{
      id: String,
      progress: Number,
      completed: Boolean,
      completedAt: Date,
    }],
    tradingSession: {
      activeItemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        default: null,
      },
      startedAt: {
        type: Date,
        default: null,
      },
    },
    swipedItems: [{
      type: Schema.Types.ObjectId,
      ref: 'Item',
    }],
    teddyTransactions: [{
      amount: Number,
      description: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

// Add password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Add comparePassword method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export const User = mongoose.model<IUser, UserModel>('User', userSchema); 