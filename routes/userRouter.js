import express from 'express';
import { registerUser, loginUser } from '../controllers/userController.js';
import { getChatHistory } from '../controllers/chatController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/chat/:userId/:otherUserId', getChatHistory);

export default router;
