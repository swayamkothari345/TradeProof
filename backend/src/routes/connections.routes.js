import { Router } from 'express';
import * as connectionsController from '../controllers/connections.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Mentor creates invitation
router.post('/invitations', authorize('MENTOR', 'INSTITUTE'), connectionsController.createInvitation);
router.get('/invitations', authorize('MENTOR', 'INSTITUTE'), connectionsController.getInvitations);

// Student accepts
router.post('/accept', connectionsController.acceptInvitation);

// Anyone views their connections
router.get('/', connectionsController.getConnections);
router.patch('/:id/revoke', connectionsController.revokeConnection);

// Mentor views student data
router.get('/students/:studentId/journal', authorize('MENTOR', 'INSTITUTE'), connectionsController.getStudentJournal);
router.get('/students/:studentId/findings', authorize('MENTOR', 'INSTITUTE'), connectionsController.getStudentFindings);

export default router;
