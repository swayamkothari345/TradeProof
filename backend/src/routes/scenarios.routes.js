import { Router } from 'express';
import * as scenariosController from '../controllers/scenarios.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Mentor / Institute — must come before generic GET /:slugOrId
router.post('/', authorize('MENTOR', 'INSTITUTE'), scenariosController.createScenario);
router.get('/mine', authorize('MENTOR', 'INSTITUTE'), scenariosController.getMentorScenarios);
router.patch('/:id/publish', authorize('MENTOR', 'INSTITUTE'), scenariosController.publishScenario);

// Scenario catalogue
router.get('/', scenariosController.listScenarios);
router.get('/attempts', scenariosController.getUserAttempts);
router.get('/:slugOrId', scenariosController.getScenario);

// Attempt lifecycle
router.post('/:id/start', scenariosController.startAttempt);
router.post('/attempts/:attemptId/submit', scenariosController.submitAttempt);
router.get('/attempts/:attemptId/review', scenariosController.getAttemptReview);

export default router;
