import { Router } from 'express';
import * as cohortsController from '../controllers/cohorts.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('INSTITUTE'));

router.get('/students', cohortsController.getInstituteStudents);
router.get('/', cohortsController.getCohorts);
router.post('/', cohortsController.createCohort);
router.delete('/:id', cohortsController.deleteCohort);
router.get('/:id/members', cohortsController.getCohortMembers);

export default router;
