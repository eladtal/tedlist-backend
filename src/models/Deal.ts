import mongoose, { Document, Schema } from 'mongoose';

export interface IDeal extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  senderItems: mongoose.Types.ObjectId[];
  receiverItems: mongoose.Types.ObjectId[];
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'completed';
  teddiesEarned?: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderItems: [{
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    }],
    receiverItems: [{
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    }],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'countered', 'completed'],
      default: 'pending',
    },
    teddiesEarned: {
      type: Number,
      default: 0,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Update lastActivityAt on any status change
DealSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.lastActivityAt = new Date();
  }
  next();
});

export default mongoose.model<IDeal>('Deal', DealSchema); 