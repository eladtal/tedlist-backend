import express from 'express';
import auth from '../middleware/auth';
import { getQuests, updateQuestProgress } from '../controllers/questController';

const router = express.Router();

// Get all quests for the authenticated user
router.get('/', auth, getQuests);

// Update quest progress
router.post('/progress', auth, updateQuestProgress);

export default router; 