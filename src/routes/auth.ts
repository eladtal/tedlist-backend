const express = require('express');
import { login, register, validateToken } from '../controllers/authController';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/validate', validateToken);

export default router; 