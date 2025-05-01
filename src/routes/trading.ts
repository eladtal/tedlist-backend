const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth').default;
const { 
  startTradingSession,
  getAvailableItems,
  swipeItem,
  resetSwipes,
  acceptTrade,
  declineTrade
} = require('../controllers/tradingController');
const { createNotification } = require('../controllers/notificationController');

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

module.exports = router; 