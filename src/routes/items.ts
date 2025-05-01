const express = require('express');
import auth from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import { getAllItems, createItem, deleteItem, getUserItems } from '../controllers/itemController';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Routes
router.get('/', getAllItems);
router.post('/', auth, upload.array('images', 5), createItem);
router.delete('/:id', auth, deleteItem);
router.get('/user', auth, getUserItems);
router.put('/:id', auth, getAllItems);

export default router;