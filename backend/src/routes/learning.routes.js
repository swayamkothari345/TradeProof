import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../config/database.js';
import { success } from '../utils/response.js';

const router = Router();
router.use(authenticate);

// ─── Learning Resources ────────────────────────────────────────────────────

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

// ─── Learning Progress ─────────────────────────────────────────────────────

router.get('/progress', async (req, res, next) => {
  try {
    const progress = await prisma.learningProgress.findMany({
      where: { userId: req.user.id },
      orderBy: { completedAt: 'desc' },
    });
    return success(res, progress);
  } catch (err) { next(err); }
});

router.post('/progress', async (req, res, next) => {
  try {
    const { lessonId, quizScore, quizMaxScore } = req.body;
    if (!lessonId) return res.status(400).json({ success: false, message: 'lessonId is required.' });

    const record = await prisma.learningProgress.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId } },
      update: {
        completedAt: new Date(),
        ...(quizScore   !== undefined && { quizScore }),
        ...(quizMaxScore !== undefined && { quizMaxScore }),
      },
      create: {
        userId: req.user.id,
        lessonId,
        quizScore:    quizScore    ?? null,
        quizMaxScore: quizMaxScore ?? null,
      },
    });
    return success(res, record, 'Progress saved.');
  } catch (err) { next(err); }
});

// ─── Daily Challenge ───────────────────────────────────────────────────────

// Returns today's challenge date + whether the user has already completed it
router.get('/daily-challenge', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const existing = await prisma.dailyChallengeAttempt.findUnique({
      where: { userId_challengeDate: { userId: req.user.id, challengeDate: today } },
    });
    return success(res, { date: today, attempt: existing ?? null });
  } catch (err) { next(err); }
});

router.post('/daily-challenge/submit', async (req, res, next) => {
  try {
    const { score, maxScore } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    // Idempotent — if already completed today, return existing
    const existing = await prisma.dailyChallengeAttempt.findUnique({
      where: { userId_challengeDate: { userId: req.user.id, challengeDate: today } },
    });
    if (existing) return success(res, { attempt: existing, streak: await calcStreak(req.user.id) });

    const attempt = await prisma.dailyChallengeAttempt.create({
      data: {
        userId: req.user.id,
        challengeDate: today,
        score:    score    ?? 0,
        maxScore: maxScore ?? 3,
      },
    });

    const streak = await calcStreak(req.user.id);
    return success(res, { attempt, streak }, 'Challenge completed!');
  } catch (err) { next(err); }
});

router.get('/daily-challenge/streak', async (req, res, next) => {
  try {
    const streak = await calcStreak(req.user.id);
    return success(res, { streak });
  } catch (err) { next(err); }
});

// ─── Exercises (legacy) ────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────

async function calcStreak(userId) {
  const attempts = await prisma.dailyChallengeAttempt.findMany({
    where: { userId },
    orderBy: { challengeDate: 'desc' },
    select: { challengeDate: true },
  });

  if (attempts.length === 0) return 0;

  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = today;

  for (const a of attempts) {
    if (a.challengeDate === cursor) {
      streak++;
      // move cursor back one day
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }

  return streak;
}
