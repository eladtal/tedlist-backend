import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types/user';

const userSchema = new mongoose.Schema<IUser>(
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
    onboardingProgress: {
      type: Number,
      default: 0,
    },
    quests: {
      type: [
        {
          id: String,
          progress: Number,
          completed: Boolean,
          completedAt: Date,
        },
      ],
      default: [],
    },
    tradingSession: {
      activeItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
      },
      startedAt: {
        type: Date,
      },
    },
    swipedItems: {
      type: [String],
      default: [],
    },
    teddyTransactions: {
      type: [
        {
          amount: Number,
          description: String,
          timestamp: Date,
        },
      ],
      default: [],
    },
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

export const User = mongoose.model<IUser>('User', userSchema); 