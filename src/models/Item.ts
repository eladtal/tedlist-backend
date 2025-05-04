import mongoose, { Document, Schema } from 'mongoose';

// Define Item interface
export interface IItem extends Document {
  title: string;
  description: string;
  images: string[];
  condition: 'New' | 'Like New' | 'Excellent' | 'Good' | 'Fair' | 'Poor';
  type: 'trade' | 'sell';
  status: 'available' | 'traded' | 'deleted';
  userId: mongoose.Types.ObjectId;
  teddyBonus?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define the interface for example items
export interface ExampleItem {
  _id: string;
  title: string;
  description: string;
  images: string[];
  condition: string;
  type: 'trade' | 'sell';
  status: 'available' | 'traded' | 'deleted';
  user: {
    name: string;
    _id: string;
  };
  teddyBonus: number;
}

const itemSchema = new Schema<IItem>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String,
    required: true
  }],
  condition: {
    type: String,
    required: true,
    enum: ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'],
    default: 'Good'
  },
  type: {
    type: String,
    required: true,
    enum: ['trade', 'sell'],
    default: 'trade'
  },
  status: {
    type: String,
    required: true,
    default: 'available',
    enum: ['available', 'traded', 'deleted']
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teddyBonus: {
    type: Number,
    default: () => Math.floor(Math.random() * 10) + 1,
    min: 1,
    max: 10
  }
}, {
  timestamps: true
});

// Add a virtual for user information
itemSchema.virtual('user').get(function() {
  return this.userId ? {
    name: (this.userId as any).name || 'Unknown User',
    _id: this.userId.toString()
  } : null;
});

export const Item = mongoose.model<IItem>('Item', itemSchema); 