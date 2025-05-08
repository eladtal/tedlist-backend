import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import authRouter from './routes/auth';
import itemsRouter from './routes/items';
import tradingRouter from './routes/trading';
import notificationsRouter from './routes/notifications';
import dealsRouter from './routes/deals';
import adminRouter from './routes/admin';
import visionRouter from './routes/vision';
import { config } from './config';
import { getPublicUrl } from './utils/s3Storage';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle image requests - redirect to S3 if file not found locally
app.use('/uploads', (req, res, next) => {
  // Try to serve from local directory first (for backward compatibility)
  const staticHandler = express.static(path.join(__dirname, '../uploads'));
  
  staticHandler(req, res, (err) => {
    if (err) {
      // If file not found locally, redirect to S3
      // Extract the file path from the URL
      const filePath = req.path;
      console.log(`File not found locally: ${filePath}, redirecting to S3`);
      
      // Redirect to S3
      const s3Url = getPublicUrl(`uploads${filePath}`);
      return res.redirect(s3Url);
    }
    next();
  });
});

// Add a custom middleware that will intercept and handle specific test routes
// This runs before the standard routing middleware
app.use((req, res, next) => {
  // Handle specific test routes directly
  if (req.path === '/api/vision/test') {
    console.log('DIRECT HANDLER: Vision API test route accessed');
    return res.json({ 
      message: 'Vision API routes are working! (Direct middleware)',
      timestamp: new Date().toISOString(),
      hasVisionApiKey: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
      path: req.path,
      method: req.method,
    });
  }
  
  // Log Vision API analyze-test requests but allow them to proceed to the actual controller
  if (req.path === '/api/vision/analyze-test' && req.method === 'POST') {
    console.log('Vision API analyze-test route accessed - forwarding to controller');
    // Continue to the next middleware/route handler instead of returning mock data
    return next();
  }
  
  // Regular test endpoint
  if (req.path === '/api/test-endpoint') {
    console.log('DIRECT HANDLER: Test endpoint accessed');
    return res.json({ 
      message: 'Test endpoint is working! (Direct middleware)',
      timestamp: new Date().toISOString(),
      hasVisionApiKey: !!process.env.GOOGLE_CLOUD_VISION_API_KEY
    });
  }
  
  // Continue to the next middleware if this isn't a special route
  next();
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/vision', visionRouter);

// Connect to MongoDB
mongoose.connect(config.mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

export default app; 