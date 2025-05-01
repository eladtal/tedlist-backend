import { Request, Response } from 'express'
import { Match } from '../models/Match'
import User from '../models/User'
import { IUser } from '../types/user'

export const createMatch = async (req: Request, res: Response) => {
  try {
    const { itemId, matchedItemId } = req.body
    const userId = (req.user as IUser)._id

    // Check if match already exists
    const existingMatch = await Match.findOne({
      $or: [
        { itemId, matchedItemId },
        { itemId: matchedItemId, matchedItemId: itemId }
      ]
    })

    if (existingMatch) {
      return res.status(400).json({ message: 'Match already exists' })
    }

    // Create new match
    const match = new Match({
      itemId,
      matchedUserId: userId,
      matchedItemId
    })

    await match.save()

    // Award Teddies for creating a match
    await User.findByIdAndUpdate(userId, {
      $inc: { teddies: 1 }
    })

    res.status(201).json(match)
  } catch (error) {
    res.status(500).json({ message: 'Error creating match', error })
  }
}

export const acceptMatch = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params
    const userId = (req.user as IUser)._id

    const match = await Match.findById(matchId)
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }

    if (match.matchedUserId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this match' })
    }

    match.status = 'accepted'
    await match.save()

    // Award Teddies for accepting a match
    await User.findByIdAndUpdate(userId, {
      $inc: { teddies: 50 }
    })

    res.json(match)
  } catch (error) {
    res.status(500).json({ message: 'Error accepting match', error })
  }
}

export const rejectMatch = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params
    const userId = (req.user as IUser)._id

    const match = await Match.findById(matchId)
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }

    if (match.matchedUserId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this match' })
    }

    match.status = 'rejected'
    await match.save()

    res.json(match)
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting match', error })
  }
}

export const getMatches = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id

    const matches = await Match.find({
      $or: [
        { matchedUserId: userId },
        { itemId: { $in: await Match.distinct('matchedItemId', { matchedUserId: userId }) } }
      ]
    })
      .populate('itemId')
      .populate('matchedItemId')
      .populate('matchedUserId', 'name')

    res.json(matches)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching matches', error })
  }
} 