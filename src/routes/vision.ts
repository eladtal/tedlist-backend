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

// Simple test route to verify the router is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Vision API routes are working!', 
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.GOOGLE_CLOUD_VISION_API_KEY
  });
});

// Test route that logs request details for debugging
router.get('/debug', (req, res) => {
  console.log('Vision API debug route accessed');
  console.log('Headers:', req.headers);
  res.json({ 
    message: 'Vision API debug info', 
    headers: req.headers,
    env: process.env.NODE_ENV,
    hasGoogleCredentials: !!process.env.GOOGLE_CLOUD_VISION_API_KEY || !!process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
});

// Route to analyze an uploaded image
router.post('/analyze', auth, uploadToMemory.single('image'), analyzeItemImage);

// Route to analyze an uploaded image (no auth for testing)
router.post('/analyze-test', uploadToMemory.single('image'), analyzeItemImage);

// Route to analyze an image by URL
router.post('/analyze-url', auth, analyzeItemImageByUrl);

// Route to analyze an image by URL (no auth for testing)
router.post('/analyze-url-test', analyzeItemImageByUrl);

export default router;
