import { Request, Response } from 'express'
import Match from '../models/Match'
import { User } from '../models/User'
import { IUser } from '../types/user'
import { AuthRequest } from '../types/auth'

type CreateMatchRequest = AuthRequest & {
  body: {
    itemId: string
    matchedItemId: string
  }
}

type UpdateMatchRequest = AuthRequest & {
  params: {
    matchId: string
  }
  body: {
    status: 'pending' | 'accepted' | 'rejected'
  }
}

type DeleteMatchRequest = AuthRequest & {
  params: {
    matchId: string
  }
}

export const createMatch = async (req: CreateMatchRequest, res: Response) => {
  try {
    const { itemId, matchedItemId } = req.body
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    const match = new Match({
      itemId,
      matchedUserId: userId,
      matchedItemId,
      status: 'pending'
    })

    await match.save()
    res.status(201).json(match)
  } catch (error) {
    res.status(500).json({ message: 'Error creating match' })
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

export const getMatches = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    const matches = await Match.find({
      $or: [
        { matchedUserId: userId },
        { itemId: { $in: await Match.distinct('itemId', { matchedUserId: userId }) } }
      ]
    }).populate('itemId matchedItemId')

    res.json(matches)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching matches' })
  }
}

export const updateMatchStatus = async (req: UpdateMatchRequest, res: Response) => {
  try {
    const { matchId } = req.params
    const { status } = req.body
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    const match = await Match.findById(matchId)
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }

    if (match.matchedUserId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this match' })
    }

    match.status = status
    await match.save()
    res.json(match)
  } catch (error) {
    res.status(500).json({ message: 'Error updating match status' })
  }
}

export const deleteMatch = async (req: DeleteMatchRequest, res: Response) => {
  try {
    const { matchId } = req.params
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    const match = await Match.findById(matchId)
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }

    if (match.matchedUserId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this match' })
    }

    await Match.findByIdAndDelete(matchId)
    res.json({ message: 'Match deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting match' })
  }
} 