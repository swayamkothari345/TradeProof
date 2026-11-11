import { Router } from 'express';
import * as rulesController from '../controllers/rules.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/evaluate/:entryId', rulesController.evaluateEntry);
router.get('/findings', rulesController.getFindings);
router.get('/coverage', rulesController.getCoverage);
router.post('/findings/:findingId/dispute', rulesController.submitDispute);
router.get('/disputes', rulesController.getDisputes);
router.patch('/disputes/:disputeId/resolve', rulesController.resolveDispute);

export default router;
