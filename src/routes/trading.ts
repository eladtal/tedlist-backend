import express from 'express';
import auth from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { 
  startTradingSession,
  getAvailableItems,
  swipeItem,
  resetSwipes,
  acceptTrade,
  declineTrade
} from '../controllers/tradingController';
import { createNotification } from '../controllers/notificationController';

const router = express.Router();

/** @typedef {import('../types/auth').AuthRequest} AuthRequest */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').RequestHandler} RequestHandler */

// Start a new trading session with a selected item
router.post('/start', auth, startTradingSession);

// Get available items for swiping
router.get('/items', auth, getAvailableItems);

// Record a swipe on an item
router.post('/swipe', auth, swipeItem);

// Reset swipes for the current user
router.post('/reset-swipes', auth, resetSwipes);

// Accept a trade request
router.post('/accept', auth, acceptTrade);

// Decline a trade request
router.post('/decline', auth, declineTrade);

export default router; 