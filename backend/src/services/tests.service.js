import prisma from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';

export async function createTest(creatorId, data) {
  const { title, description, topic, difficulty, durationMin, isSelfTest, questions } = data;

  return prisma.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: { creatorId, title, description, topic, difficulty, durationMin, isSelfTest },
    });

    for (const q of questions ?? []) {
      const question = await tx.testQuestion.create({
        data: {
          testId: test.id,
          questionText: q.questionText,
          explanation: q.explanation,
          orderIndex: q.orderIndex ?? 0,
          marks: q.marks ?? 1,
        },
      });
      for (const opt of q.options ?? []) {
        await tx.testOption.create({
          data: {
            questionId: question.id,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect ?? false,
            orderIndex: opt.orderIndex ?? 0,
          },
        });
      }
    }

    return tx.test.findUnique({
      where: { id: test.id },
      include: {
        questions: {
          include: { options: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  });
}

export async function getTests(userId, role) {
  if (role === 'MENTOR' || role === 'INSTITUTE') {
    return prisma.test.findMany({
      where: { creatorId: userId },
      include: {
        questions: { select: { id: true } },
        assignments: { select: { id: true } },
        attempts: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Students/Traders: assigned tests + self tests
  const [assigned, selfTests] = await Promise.all([
    prisma.testAssignment.findMany({
      where: { assignedTo: userId },
      include: {
        test: {
          include: {
            questions: { select: { id: true } },
            creator: { select: { profile: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    }),
    prisma.test.findMany({
      where: { isSelfTest: true, status: 'PUBLISHED' },
      include: { questions: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const userAttempts = await prisma.testAttempt.findMany({
    where: { userId },
    select: { testId: true, status: true, score: true, percentage: true, submittedAt: true },
  });

  const attemptMap = {};
  for (const a of userAttempts) {
    if (!attemptMap[a.testId] || a.submittedAt > (attemptMap[a.testId].submittedAt ?? 0)) {
      attemptMap[a.testId] = a;
    }
  }

  return {
    assigned: assigned.map(a => ({ ...a, latestAttempt: attemptMap[a.testId] ?? null })),
    selfTests: selfTests.map(t => ({ ...t, latestAttempt: attemptMap[t.id] ?? null })),
  };
}

export async function getTestForTaking(testId, userId) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      questions: {
        include: {
          options: {
            select: {
              id: true,
              optionText: true,
              orderIndex: true,
              // isCorrect excluded intentionally
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });
  if (!test) throw createError(404, 'Test not found.');
  if (test.status !== 'PUBLISHED') throw createError(400, 'This test is not currently available.');

  const existingAttempt = await prisma.testAttempt.findFirst({
    where: { testId, userId, status: 'IN_PROGRESS' },
  });

  return { test, existingAttemptId: existingAttempt?.id ?? null };
}

export async function startAttempt(testId, userId) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.status !== 'PUBLISHED') throw createError(400, 'Test is not available.');

  const inProgress = await prisma.testAttempt.findFirst({
    where: { testId, userId, status: 'IN_PROGRESS' },
  });
  if (inProgress) return inProgress;

  return prisma.testAttempt.create({
    data: { testId, userId },
  });
}

export async function submitAttempt(attemptId, userId, answers) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        include: {
          questions: {
            include: { options: true },
          },
        },
      },
    },
  });
  if (!attempt) throw createError(404, 'Attempt not found.');
  if (attempt.userId !== userId) throw createError(403, 'Access denied.');
  if (attempt.status === 'SUBMITTED' || attempt.status === 'SCORED') {
    throw createError(409, 'This attempt has already been submitted.');
  }

  // Server-side scoring
  const questionMap = {};
  for (const q of attempt.test.questions) {
    questionMap[q.id] = q;
  }

  let totalScore = 0;
  let maxScore = 0;
  const answerRecords = [];

  for (const q of attempt.test.questions) {
    maxScore += q.marks;
    const userAnswer = answers.find(a => a.questionId === q.id);
    const selectedOptionId = userAnswer?.selectedOptionId ?? null;
    const correctOption = q.options.find(o => o.isCorrect);
    const isCorrect = selectedOptionId != null && selectedOptionId === correctOption?.id;
    const marksAwarded = isCorrect ? q.marks : 0;
    totalScore += marksAwarded;

    answerRecords.push({
      attemptId,
      questionId: q.id,
      selectedOptionId,
      isCorrect,
      marksAwarded,
    });
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  await prisma.$transaction(async (tx) => {
    // Delete previous answers if any
    await tx.testAnswer.deleteMany({ where: { attemptId } });
    await tx.testAnswer.createMany({ data: answerRecords });
    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SCORED',
        score: totalScore,
        maxScore,
        percentage,
        submittedAt: new Date(),
        scoredAt: new Date(),
      },
    });
  });

  return {
    attemptId,
    score: totalScore,
    maxScore,
    percentage: Math.round(percentage * 100) / 100,
    passed: percentage >= 50,
  };
}

export async function getAttemptResult(attemptId, userId) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: { select: { id: true, title: true, topic: true } },
      answers: {
        include: {
          question: {
            include: {
              options: { orderBy: { orderIndex: 'asc' } }, // includes isCorrect now
            },
          },
        },
      },
    },
  });
  if (!attempt) throw createError(404, 'Attempt not found.');
  if (attempt.userId !== userId) throw createError(403, 'Access denied.');
  if (attempt.status === 'IN_PROGRESS') throw createError(400, 'This attempt has not been submitted yet.');

  return attempt;
}

// ─── Platform test library (visible to all authenticated users) ───────────────

export async function getTestLibrary({ topic, difficulty, type } = {}) {
  const where = { isSystem: true, status: 'PUBLISHED' };
  if (topic) where.topic = topic;
  if (difficulty) where.difficulty = difficulty;

  const tests = await prisma.test.findMany({
    where,
    include: { questions: { select: { id: true } } },
    orderBy: [{ difficulty: 'asc' }, { topic: 'asc' }, { createdAt: 'asc' }],
  });

  return tests;
}

export async function publishTest(testId, creatorId) {
  const test = await prisma.test.findFirst({ where: { id: testId, creatorId } });
  if (!test) throw createError(404, 'Test not found.');

  const questionCount = await prisma.testQuestion.count({ where: { testId } });
  if (questionCount === 0) throw createError(400, 'Cannot publish a test with no questions.');

  return prisma.test.update({
    where: { id: testId },
    data: { status: 'PUBLISHED' },
  });
}

export async function assignTest(testId, creatorId, assignData) {
  const test = await prisma.test.findFirst({
    where: { id: testId, OR: [{ creatorId }, { isSystem: true }] },
  });
  if (!test) throw createError(404, 'Test not found.');

  return prisma.testAssignment.create({
    data: {
      testId,
      assignedTo: assignData.assignedTo ?? null,
      cohortId: assignData.cohortId ?? null,
      dueAt: assignData.dueAt ? new Date(assignData.dueAt) : null,
    },
  });
}
