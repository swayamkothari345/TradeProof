import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/pnl-chart', analyticsController.getPnlChart);
router.get('/strategy-performance', analyticsController.getStrategyPerformance);

export default router;
