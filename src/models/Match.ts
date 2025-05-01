import mongoose, { Schema, Document } from 'mongoose'

export interface IMatch extends Document {
  itemId: mongoose.Types.ObjectId
  matchedUserId: mongoose.Types.ObjectId
  matchedItemId: mongoose.Types.ObjectId
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
}

const MatchSchema: Schema = new Schema({
  itemId: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  matchedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchedItemId: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model<IMatch>('Match', MatchSchema) 