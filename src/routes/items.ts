import express from 'express';
import auth from '../middleware/auth';
import { getAllItems, createItem, deleteItem, getUserItems, getAvailableItems, uploadImage } from '../controllers/itemController';
import { upload } from '../utils/storage';

const router = express.Router();

// Routes
router.get('/', getAllItems);
router.get('/user', auth, getUserItems);
router.get('/available', auth, getAvailableItems);
router.post('/', auth, upload.array('images', 5), createItem);
router.delete('/:id', auth, deleteItem);
router.post('/upload-image', auth, upload.single('image'), uploadImage);

export default router;