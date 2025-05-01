import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface Quest {
  id: string;
  progress: number;
  completed: boolean;
  completedAt?: Date;
}

export interface TradingSession {
  activeItemId: Types.ObjectId;
  startedAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  teddies: number;
  badges: string[];
  streak: {
    count: number;
    lastLogin: Date;
  };
  onboardingProgress: number;
  quests: Quest[];
  tradingSession?: TradingSession;
  swipedItems: string[];
  teddyTransactions: {
    amount: number;
    description: string;
    timestamp: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface AuthRequest extends Omit<Request, 'user'> {
  user?: IUser;
} 