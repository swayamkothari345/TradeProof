import { Router } from 'express';
import * as ctrl from '../controllers/aicoach.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Legacy analysis
router.post('/generate', ctrl.generate);
router.get('/latest', ctrl.getLatest);
router.post('/ask', ctrl.ask);

// Conversations
router.get('/conversations', ctrl.listConversations);
router.post('/conversations', ctrl.createConversation);
router.get('/conversations/:id', ctrl.getConversation);
router.patch('/conversations/:id', ctrl.updateConversation);
router.delete('/conversations/:id', ctrl.deleteConversation);
router.post('/conversations/:id/messages', ctrl.sendMessage);

export default router;
