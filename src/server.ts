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
import itemsRouter from './routes/items';
import authRouter from './routes/auth';
import tradingRouter from './routes/trading';
import notificationsRouter from './routes/notifications';

interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

interface WebSocketWithData extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

dotenv.config();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ 
  server: httpServer,
  path: '/ws',
  verifyClient: ({ origin, req }, callback) => {
    // Allow connections from localhost:3000 (frontend) and localhost:8000 (backend)
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:8000'];
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

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tedlist.onrender.com', 'https://tedlist-frontend.onrender.com']
    : 'http://localhost:5173',
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Debug middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Routes
app.use('/api/items', itemsRouter);
app.use('/api/auth', authRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/notifications', notificationsRouter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tedlist')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app; 