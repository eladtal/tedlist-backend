import { Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  teddies: number;
  badges: string[];
  streak: {
    count: number;
    lastLogin: Date | null;
  };
  onboardingProgress: number;
  quests: {
    id: string;
    progress: number;
    completed: boolean;
    completedAt?: Date;
  }[];
  tradingSession?: {
    activeItemId: string;
    startedAt: Date;
  };
  swipedItems: string[];
  teddyTransactions: {
    amount: number;
    description: string;
    timestamp: Date;
  }[];
  comparePassword(candidatePassword: string): Promise<boolean>;
} 