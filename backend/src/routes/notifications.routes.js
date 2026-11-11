import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', notificationsController.getNotifications);
router.patch('/:id/read', notificationsController.markRead);
router.post('/mark-all-read', notificationsController.markAllRead);

export default router;
