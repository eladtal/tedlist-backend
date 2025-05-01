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
import { config } from './config';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/admin', adminRouter);

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