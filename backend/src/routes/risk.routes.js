import { Router } from 'express';
import * as riskController from '../controllers/risk.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/position-size', riskController.positionSize);
router.post('/risk-reward', riskController.riskReward);
router.post('/checklist', riskController.checklist);

export default router;
