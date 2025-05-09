// Import required modules

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

// Super permissive CORS configuration for Flutter web app testing
// WARNING: This is for development and testing only
// In production, you should restrict origins appropriately
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

// Standard CORS middleware as backup
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400  // Cache preflight request results for 24 hours (in seconds)
};

// Apply CORS preflight handling for all routes
app.options('*', cors(corsOptions));

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add a simple test endpoint that returns basic response to check connectivity
app.get('/api/test-endpoint', (req, res) => {
  console.log('Test endpoint hit from:', req.headers.origin);
  res.json({
    success: true,
    message: 'Backend is accessible',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Server configuration

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

// Debug middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`============= REQUEST DEBUG [${new Date().toISOString()}] =============`);
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('Body:', req.body ? '(body present)' : '(no body)');
  console.log('=================================================================');
  next();
});

// Add a custom middleware that will intercept and handle specific test routes
// This runs before the standard routing middleware
app.use((req, res, next) => {
  console.log(`MIDDLEWARE: Request received for ${req.method} ${req.path}`);
  
  // Handle specific test routes directly
  if (req.path === '/api/vision/test') {
    console.log('DIRECT HANDLER: Vision API test route accessed');
    return res.json({ 
      message: 'Vision API routes are working! (Direct middleware)',
      timestamp: new Date().toISOString(),
      hasVisionApiKey: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
      hasServiceAccount: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      path: req.path,
      method: req.method,
    });
  }
  
  // DIRECT HANDLER for our special test route
  if (req.path === '/api/vision/direct-test') {
    console.log('DIRECT HANDLER: Vision API direct-test route accessed');
    return res.json({
      message: 'This is a direct handler that bypasses the router system',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      router: 'none - direct middleware'
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

// Add direct test routes that bypass the router system entirely
app.get('/debug-direct-test', (req, res) => {
  console.log('DIRECT APP TEST ROUTE ACCESSED (bypassing all routers)');
  res.json({
    message: 'Direct test route works (no router involved)',
    timestamp: new Date().toISOString(),
    path: req.path,
    url: req.url,
    method: req.method,
    baseUrl: req.baseUrl,
    envVars: {
      NODE_ENV: process.env.NODE_ENV,
      hasServiceAccount: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
    }
  });
});

// Debug Vision router registration
console.log('======= REGISTERING VISION ROUTER =======');
console.log('visionRouter routes:', Object.keys(visionRouter.stack || {}).length || 'unknown');

// Register Vision API routes at BOTH paths to handle incorrect frontend URLs
app.use('/api/vision', visionRouter);  // Correct path with /api prefix
app.use('/vision', visionRouter);      // Also register at incorrect path for compatibility

console.log('Vision router registered at: /api/vision and /vision');

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