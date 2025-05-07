import express from 'express';
import auth from '../middleware/auth';
import { analyzeItemImage, analyzeItemImageByUrl } from '../controllers/visionController';
import { upload } from '../utils/storage';
import multer from 'multer';

const router = express.Router();

// Configure multer to use memory storage for image analysis
const memoryStorage = multer.memoryStorage();
const uploadToMemory = multer({ 
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  } 
});

// Route to analyze an uploaded image
router.post('/analyze', auth, uploadToMemory.single('image'), analyzeItemImage);

// Route to analyze an image by URL
router.post('/analyze-url', auth, analyzeItemImageByUrl);

export default router;
