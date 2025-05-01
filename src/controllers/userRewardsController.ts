import { Request, Response } from 'express'
import { User } from '../models/User'
import { IUser } from '../types/user'

export const addTeddies = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { teddies: amount } },
      { new: true }
    )

    res.json({ teddies: user?.teddies })
  } catch (error) {
    res.status(500).json({ message: 'Error adding Teddies', error })
  }
}

export const addBadge = async (req: Request, res: Response) => {
  try {
    const { badge } = req.body
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { badges: badge } },
      { new: true }
    )

    res.json({ badges: user?.badges })
  } catch (error) {
    res.status(500).json({ message: 'Error adding badge', error })
  }
}

export const updateStreak = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!user.streak.lastLogin) {
      // First login
      user.streak = { count: 1, lastLogin: today }
      await user.save()
      return res.json({ streak: user.streak.count })
    }

    const lastLogin = new Date(user.streak.lastLogin)
    lastLogin.setHours(0, 0, 0, 0)

    const diffTime = Math.abs(today.getTime() - lastLogin.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      // Consecutive day
      user.streak.count += 1
      let bonusTeddies = 0

      if (user.streak.count === 1) bonusTeddies = 100
      else if (user.streak.count === 2) bonusTeddies = 150
      else if (user.streak.count === 5) {
        bonusTeddies = 500
        if (!user.badges.includes('streak_master')) {
          user.badges.push('streak_master')
        }
      }

      user.teddies += bonusTeddies
    } else if (diffDays > 1) {
      // Streak broken
      user.streak.count = 1
    }

    user.streak.lastLogin = today
    await user.save()

    res.json({ 
      streak: user.streak.count,
      teddies: user.teddies,
      badges: user.badges
    })
  } catch (error) {
    res.status(500).json({ message: 'Error updating streak', error })
  }
}

export const updateOnboardingProgress = async (req: Request, res: Response) => {
  try {
    const { step } = req.body
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    const progress = Math.min(step * 33, 100)
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (progress === 100 && !user.badges.includes('starter')) {
      user.badges.push('starter')
      user.teddies += 500 // Award 500 Teddies for completing onboarding
    }

    user.onboardingProgress = progress
    await user.save()

    res.json({ 
      onboardingProgress: user.onboardingProgress,
      badges: user.badges,
      teddies: user.teddies
    })
  } catch (error) {
    res.status(500).json({ message: 'Error updating onboarding progress', error })
  }
} 