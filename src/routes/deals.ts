import express from 'express';
import auth from '../middleware/auth';
import { getSentDeals, getReceivedDeals } from '../controllers/dealController';

const router = express.Router();

// Get deals sent by the user
router.get('/sent', auth, getSentDeals);

// Get deals received by the user
router.get('/received', auth, getReceivedDeals);

export default router; 