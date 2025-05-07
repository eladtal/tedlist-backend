import express from 'express';
import auth from '../middleware/auth';
import { getAllItems, createItem, deleteItem, getUserItems, getAvailableItems, uploadImage } from '../controllers/itemController';
import { upload } from '../utils/storage';
import multer from 'multer';

const router = express.Router();

// Configure multer to use memory storage for S3 uploads
const memoryStorage = multer.memoryStorage();
const uploadToMemory = multer({ 
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  } 
});

// Routes
router.get('/', getAllItems);
router.get('/user', auth, getUserItems);
router.get('/available', auth, getAvailableItems);
router.post('/', auth, uploadToMemory.array('images', 5), createItem);
router.delete('/:id', auth, deleteItem);
// Use memory storage for S3 upload instead of disk storage
router.post('/upload-image', auth, uploadToMemory.single('image'), uploadImage);

export default router;