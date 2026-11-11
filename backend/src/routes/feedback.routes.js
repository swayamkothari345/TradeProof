import { Router } from 'express';
import * as feedbackController from '../controllers/feedback.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('MENTOR', 'INSTITUTE'), feedbackController.giveFeedback);
router.get('/mine', feedbackController.getMyFeedback);

export default router;
