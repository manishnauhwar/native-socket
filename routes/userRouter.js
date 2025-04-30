import express from 'express';
import { registerUser, loginUser, getAllUsers, getUnreadCounts } from '../controllers/userController.js';
import { getChatHistory, deleteMessage, clearChat } from '../controllers/chatController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/chat/:userId/:otherUserId', getChatHistory);
router.post('/chat/delete', deleteMessage);
router.post('/chat/clear', clearChat);
router.get('/all', getAllUsers);
router.get('/unread-counts/:userId', getUnreadCounts);

export default router;
