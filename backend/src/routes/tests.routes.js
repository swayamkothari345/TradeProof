import { Router } from 'express';
import * as testsController from '../controllers/tests.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTestSchema, submitAnswersSchema, assignTestSchema } from '../validators/test.validators.js';

const router = Router();
router.use(authenticate);

// Mentor/Institute only
router.post('/', authorize('MENTOR', 'INSTITUTE'), validate(createTestSchema), testsController.createTest);
router.patch('/:id/publish', authorize('MENTOR', 'INSTITUTE'), testsController.publishTest);
router.post('/:id/assign', authorize('MENTOR', 'INSTITUTE'), validate(assignTestSchema), testsController.assignTest);
router.post('/assignments', authorize('MENTOR', 'INSTITUTE'), testsController.createBulkAssignment);
router.get('/assignments', authorize('MENTOR', 'INSTITUTE'), testsController.getMentorAssignments);
router.get('/assignments/:batchId', authorize('MENTOR', 'INSTITUTE'), testsController.getAssignmentBatch);

// All roles
router.get('/library', testsController.getTestLibrary);
router.get('/', testsController.getTests);
router.get('/:id', testsController.getTest);
router.post('/:id/start', testsController.startAttempt);
router.post('/attempts/:attemptId/submit', validate(submitAnswersSchema), testsController.submitAttempt);
router.get('/attempts/:attemptId/result', testsController.getAttemptResult);

export default router;
