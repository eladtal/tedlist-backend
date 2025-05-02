// Add type declaration at the top of the file
declare global {
  var heartbeatInterval: NodeJS.Timeout | undefined;
}

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import authRouter from './routes/auth';
import itemsRouter from './routes/items';
import notificationsRouter from './routes/notifications';
import dealsRouter from './routes/deals';
import tradingRouter from './routes/trading';
import adminRouter from './routes/admin';
import fs from 'fs';
import multer from 'multer';

interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

interface WebSocketWithData extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

// Load environment variables first
dotenv.config();

const app = express();
const server = createServer(app);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tedlist.onrender.com']
    : ['http://localhost:3000', 'http://localhost:8000'],
  credentials: true
}));

// Use bodyParser for JSON and URL-encoded data
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const uploadsPath = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/uploads'
  : path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d', // Cache for 1 day
  fallthrough: false // Return 404 if file not found
}));

// Error handling for file uploads
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File is too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      message: 'File upload error: ' + err.message
    });
  }
  
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({
      message: err.message
    });
  }
  
  next(err);
});

// Debug middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Register routes
app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/admin', adminRouter);

// WebSocket setup
const wss = new WebSocketServer({ 
  server: server,
  path: '/ws',
  verifyClient: ({ origin }, callback) => {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:8000'];
    if (process.env.NODE_ENV === 'production') {
      allowedOrigins.push('https://tedlist.onrender.com');
    }
    if (allowedOrigins.includes(origin)) {
      callback(true);
    } else {
      console.log('Rejected WebSocket connection from origin:', origin);
      callback(false, 403, 'Forbidden');
    }
  }
});

// Store connected users with last connection time
export const connectedUsers = new Map<string, { ws: WebSocketWithData, lastConnected: Date }>();

// Authenticate WebSocket connection
const authenticateConnection = (ws: WebSocketWithData, message: any) => {
  try {
    const token = message.token;
    if (!token) {
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication token missing' }));
      ws.close();
      return false;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
    
    if (!decoded.userId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid token payload' }));
      ws.close();
      return false;
    }
    
    ws.userId = decoded.userId;
    ws.isAlive = true;
    return true;
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
    ws.close();
    return false;
  }
};

// Broadcast message to specific user
export const sendNotificationToUser = (userId: string, notification: any) => {
  const userData = connectedUsers.get(userId);
  if (userData?.ws.readyState === WebSocket.OPEN) {
    userData.ws.send(JSON.stringify({
      type: 'notification',
      data: notification
    }));
  }
};

// Add heartbeat interval to keep connections alive
function heartbeat(this: WebSocketWithData) {
  this.isAlive = true;
}

// Clear any existing interval
if (global.heartbeatInterval) {
  clearInterval(global.heartbeatInterval);
}

// Set up heartbeat interval
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: WebSocket) => {
    const client = ws as WebSocketWithData;
    if (client.isAlive === false) {
      console.log('Terminating inactive connection');
      if (client.userId) {
        connectedUsers.delete(client.userId);
      }
      return client.terminate();
    }
    
    client.isAlive = false;
    client.send(JSON.stringify({ type: 'ping' }));
  });
}, 30000);

// Store interval reference
global.heartbeatInterval = heartbeatInterval;

wss.on('connection', (ws: WebSocketWithData) => {
  ws.isAlive = true;
  console.log('New WebSocket connection attempt');

  // Set up heartbeat
  ws.on('pong', heartbeat);

  // Send immediate ping to verify connection
  ws.send(JSON.stringify({ type: 'ping' }));

  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data);
      console.log('Received message:', message);

      switch (message.type) {
        case 'authenticate':
          console.log('Authentication attempt with token:', message.token ? 'present' : 'missing');
          if (authenticateConnection(ws, message)) {
            connectedUsers.set(ws.userId!, {
              ws,
              lastConnected: new Date()
            });
            console.log('Client authenticated successfully:', ws.userId);
            ws.send(JSON.stringify({
              type: 'connection_status',
              data: { connected: true, userId: ws.userId }
            }));
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', (code: number, reason: string) => {
    console.log('WebSocket closed:', { code, reason });
    if (ws.userId) {
      connectedUsers.delete(ws.userId);
      console.log('Client disconnected:', ws.userId);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket connection error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'An error occurred with the connection'
    }));
  });
});

// Log when the WebSocket server is ready
wss.on('listening', () => {
  console.log('WebSocket server is ready and listening');
});

// Log any WebSocket server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tedlist')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: err.message 
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app; 