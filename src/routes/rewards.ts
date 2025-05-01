import express from 'express'
import authenticate from '../middleware/auth'
import {
  addTeddies,
  addBadge,
  updateStreak,
  updateOnboardingProgress
} from '../controllers/userRewardsController'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Add Teddies to user's balance
router.post('/teddies', addTeddies)

// Add a badge to user's collection
router.post('/badges', addBadge)

// Update user's login streak
router.post('/streak', updateStreak)

// Update user's onboarding progress
router.post('/onboarding', updateOnboardingProgress)

export default router 