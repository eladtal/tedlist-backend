import express from 'express';
import auth from '../middleware/auth';
import { analyzeItemImage, analyzeItemImageByUrl, analyzeItemImageTest, analyzeItemImageByUrlTest } from '../controllers/visionController';
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

// Simple route to verify the Vision API is configured correctly
router.get('/status', (req, res) => {
  res.json({ 
    status: 'online',
    serviceAccountConfigured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    apiKeyConfigured: !!process.env.GOOGLE_CLOUD_VISION_API_KEY
  });
});

// Route to analyze an uploaded image
router.post('/analyze', auth, uploadToMemory.single('image'), analyzeItemImage);

// Main production routes with authentication
router.post('/analyze-url', auth, analyzeItemImageByUrl);

// Test endpoints (keeping one test endpoint for each method for troubleshooting)
// These don't require authentication and are useful for testing and debugging
router.post('/test/analyze', uploadToMemory.single('image'), analyzeItemImageTest);
router.post('/test/analyze-url', analyzeItemImageByUrlTest);

// Keep original endpoint paths for backward compatibility with existing clients
router.post('/analyze-test', uploadToMemory.single('image'), analyzeItemImageTest);
router.post('/analyze-url-test', analyzeItemImageByUrlTest);

export default router;
