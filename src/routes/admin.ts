import express from 'express';
import auth from '../middleware/auth';
import { isAdmin, getAllUsers, makeAdmin, removeAdmin, updateAdminPrivileges, deleteUser, deleteAllUserItems } from '../controllers/adminController';

const router = express.Router();

// All routes require authentication and admin privileges
router.use(auth);
router.use(isAdmin);

// Get all users
router.get('/users', getAllUsers);

// Make a user an admin
router.post('/users/:userId/make-admin', makeAdmin);

// Remove admin privileges
router.post('/users/:userId/remove-admin', removeAdmin);

// Update admin privileges
router.put('/users/:userId/privileges', updateAdminPrivileges);

// Delete a user (soft delete)
router.post('/users/:userId/delete', deleteUser);

// Delete all items from a user
router.delete('/users/:userId/items', deleteAllUserItems);

export default router; 