import { Router } from 'express';
import * as aicoachController from '../controllers/aicoach.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/generate', aicoachController.generate);
router.get('/latest', aicoachController.getLatest);

export default router;
