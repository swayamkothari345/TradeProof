import { Router } from 'express';
import * as journalController from '../controllers/journal.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { createJournalEntrySchema, updateJournalEntrySchema, journalQuerySchema } from '../validators/journal.validators.js';

const router = Router();
router.use(authenticate);

router.get('/', validateQuery(journalQuerySchema), journalController.getEntries);
router.post('/', validate(createJournalEntrySchema), journalController.createEntry);
router.get('/stats', journalController.getStats);
router.get('/export', journalController.exportCsv);
router.get('/strategies', journalController.getStrategies);
router.post('/strategies', journalController.createStrategy);
router.get('/:id', journalController.getEntry);
router.patch('/:id', validate(updateJournalEntrySchema), journalController.updateEntry);
router.delete('/:id', journalController.deleteEntry);

export default router;
