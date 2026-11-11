import { Router } from 'express';
import authRoutes from './auth.routes.js';
import portfolioRoutes from './portfolio.routes.js';
import journalRoutes from './journal.routes.js';
import riskRoutes from './risk.routes.js';
import rulesRoutes from './rules.routes.js';
import testsRoutes from './tests.routes.js';
import connectionsRoutes from './connections.routes.js';
import analyticsRoutes from './analytics.routes.js';
import aicoachRoutes from './aicoach.routes.js';
import notificationsRoutes from './notifications.routes.js';
import feedbackRoutes from './feedback.routes.js';
import learningRoutes from './learning.routes.js';
import marketRoutes from './market.routes.js';
import scenariosRoutes from './scenarios.routes.js';
import cohortsRoutes from './cohorts.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/portfolios', portfolioRoutes);
router.use('/journal', journalRoutes);
router.use('/risk', riskRoutes);
router.use('/rules', rulesRoutes);
router.use('/tests', testsRoutes);
router.use('/connections', connectionsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ai-coach', aicoachRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/learning', learningRoutes);
router.use('/market', marketRoutes);
router.use('/scenarios', scenariosRoutes);
router.use('/cohorts', cohortsRoutes);

export default router;
