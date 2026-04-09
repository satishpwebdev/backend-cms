import { Router } from 'express';
import {
  getChatHistories,
  getChatMessages,
  createChat,
  addMessage,
  updateChatTitle,
  deleteChat,
} from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getChatHistories);
router.get('/:chatId', getChatMessages);
router.post('/', createChat);
router.post('/:chatId/messages', addMessage);
router.put('/:chatId', updateChatTitle);
router.delete('/:chatId', deleteChat);

export default router;
