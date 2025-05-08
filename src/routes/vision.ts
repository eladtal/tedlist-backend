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

// Simple test route to verify the router is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Vision API routes are working!', 
    timestamp: new Date().toISOString(),
    serviceAccountConfigured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set'
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
    hasServiceAccount: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'not set'
  });
});

// Route to analyze an uploaded image
router.post('/analyze', auth, uploadToMemory.single('image'), analyzeItemImage);

// Route to analyze an uploaded image (no auth for testing)
router.post('/analyze-test', uploadToMemory.single('image'), analyzeItemImageTest);

// Route to analyze an image by URL
router.post('/analyze-url', auth, analyzeItemImageByUrl);

// Route to analyze an image by URL (no auth for testing)
router.post('/analyze-url-test', analyzeItemImageByUrlTest);

// Ultra-simple test route with no dependencies or middleware
router.get('/simple-test', (req, res) => {
  console.log('SIMPLE TEST ROUTE ACCESSED');
  res.json({
    message: 'Simple Vision API test route',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    hasServiceAccount: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    hasApiKey: !!process.env.GOOGLE_CLOUD_VISION_API_KEY
  });
});

export default router;
