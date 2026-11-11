import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../config/database.js';
import { success } from '../utils/response.js';

const router = Router();
router.use(authenticate);

router.get('/resources', async (req, res, next) => {
  try {
    const { category, difficulty, search } = req.query;
    const where = { isPublished: true };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const resources = await prisma.learningResource.findMany({ where, orderBy: { createdAt: 'asc' } });
    return success(res, resources);
  } catch (err) { next(err); }
});

router.get('/resources/:id', async (req, res, next) => {
  try {
    const resource = await prisma.learningResource.findUnique({
      where: { id: req.params.id },
      include: { exercises: true },
    });
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found.' });
    return success(res, resource);
  } catch (err) { next(err); }
});

router.get('/exercises', async (req, res, next) => {
  try {
    const assignments = await prisma.exerciseAssignment.findMany({
      where: { userId: req.user.id },
      include: { exercise: true },
      orderBy: { assignedAt: 'desc' },
    });
    return success(res, assignments);
  } catch (err) { next(err); }
});

router.patch('/exercises/:id/complete', async (req, res, next) => {
  try {
    const assignment = await prisma.exerciseAssignment.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { isCompleted: true, completedAt: new Date() },
    });
    return success(res, assignment, 'Exercise marked complete.');
  } catch (err) { next(err); }
});

export default router;
