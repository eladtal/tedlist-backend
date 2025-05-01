import { Document } from 'mongoose';

export interface IUser {
  _id: string;
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
  isAdmin: boolean;
  adminPrivileges: string[];
  onboardingProgress: number;
  quests: {
    id: string;
    progress: number;
    completed: boolean;
    completedAt?: Date;
  }[];
  tradingSession?: {
    activeItemId?: string;
    startedAt?: Date;
  };
  swipedItems: string[];
  teddyTransactions: {
    amount: number;
    description: string;
    timestamp: Date;
  }[];
  isDeleted?: boolean;
  deletedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
} 