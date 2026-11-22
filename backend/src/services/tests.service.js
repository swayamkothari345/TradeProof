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
  const where = {
    status: 'PUBLISHED',
    OR: [{ isSystem: true }, { isSelfTest: true }],
  };
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

  const assignment = await prisma.testAssignment.create({
    data: {
      testId,
      assignedBy: creatorId,
      assignedTo: assignData.assignedTo ?? null,
      cohortId: assignData.cohortId ?? null,
      dueAt: assignData.dueAt ? new Date(assignData.dueAt) : null,
    },
  });

  // Notify assigned student
  if (assignData.assignedTo) {
    const dueStr = assignData.dueAt
      ? ` — due ${new Date(assignData.dueAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
      : '';
    await prisma.notification.create({
      data: {
        userId: assignData.assignedTo,
        type: 'TEST_ASSIGNED',
        title: 'New test assigned',
        message: `"${test.title}" has been assigned to you${dueStr}.`,
        referenceId: assignment.id,
      },
    });
  }

  return assignment;
}

export async function createBulkAssignment(mentorId, data) {
  const { testId, scenarioId, studentIds, cohortId, title, instructions, startAt, dueAt, timeLimitMin, maxAttempts, passingScore } = data;

  // Validate either testId or scenarioId is provided
  if (!testId && !scenarioId) throw createError(400, 'Either testId or scenarioId is required.');

  // If testId, verify mentor can assign this test
  if (testId) {
    const test = await prisma.test.findFirst({
      where: { id: testId, OR: [{ creatorId: mentorId }, { isSystem: true }, { isSelfTest: true }] },
    });
    if (!test) throw createError(404, 'Test not found.');
  }

  // If scenarioId, verify it exists and is published
  if (scenarioId) {
    const scenario = await prisma.tradingScenario.findFirst({
      where: { id: scenarioId, isPublished: true },
    });
    if (!scenario) throw createError(404, 'Scenario not found.');
  }

  const batchId = `batch_${Date.now()}_${mentorId.slice(-6)}`;

  const records = [];

  if (studentIds?.length) {
    for (const studentId of studentIds) {
      records.push({
        testId: testId ?? null,
        scenarioId: scenarioId ?? null,
        assignedBy: mentorId,
        assignedTo: studentId,
        batchId,
        title: title ?? null,
        instructions: instructions ?? null,
        startAt: startAt ? new Date(startAt) : null,
        dueAt: dueAt ? new Date(dueAt) : null,
        timeLimitMin: timeLimitMin ?? null,
        maxAttempts: maxAttempts ?? 1,
        passingScore: passingScore ?? null,
      });
    }
  }

  if (cohortId) {
    records.push({
      testId: testId ?? null,
      scenarioId: scenarioId ?? null,
      assignedBy: mentorId,
      cohortId,
      batchId,
      title: title ?? null,
      instructions: instructions ?? null,
      startAt: startAt ? new Date(startAt) : null,
      dueAt: dueAt ? new Date(dueAt) : null,
      timeLimitMin: timeLimitMin ?? null,
      maxAttempts: maxAttempts ?? 1,
      passingScore: passingScore ?? null,
    });
  }

  if (records.length === 0) throw createError(400, 'No students or cohort specified.');

  await prisma.testAssignment.createMany({ data: records });

  // ── Send notifications ──────────────────────────────────────────────────
  const notifTitle = testId ? 'New test assigned' : 'New scenario assigned';
  const dueStr = dueAt
    ? ` — due ${new Date(dueAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
    : '';

  // Fetch content name for the notification message
  let contentName = title;
  if (!contentName) {
    if (testId) {
      const t = await prisma.test.findUnique({ where: { id: testId }, select: { title: true } });
      contentName = t?.title;
    } else if (scenarioId) {
      const s = await prisma.tradingScenario.findUnique({ where: { id: scenarioId }, select: { title: true } });
      contentName = s?.title;
    }
  }
  const notifMsg = contentName
    ? `"${contentName}" has been assigned to you${dueStr}.`
    : `A new assignment is waiting for you${dueStr}.`;

  // Collect all target user IDs (avoid duplicates with Set)
  const targetIds = new Set(studentIds ?? []);

  if (cohortId) {
    const members = await prisma.cohortMember.findMany({
      where: { cohortId },
      select: { userId: true },
    });
    members.forEach(m => targetIds.add(m.userId));
  }

  if (targetIds.size > 0) {
    await prisma.notification.createMany({
      data: Array.from(targetIds).map(userId => ({
        userId,
        type: 'TEST_ASSIGNED',
        title: notifTitle,
        message: notifMsg,
        referenceId: batchId,
      })),
    });
  }

  return { batchId, count: records.length };
}

export async function getMentorAssignments(mentorId) {
  const assignments = await prisma.testAssignment.findMany({
    where: { assignedBy: mentorId },
    include: {
      test: { select: { id: true, title: true, topic: true, difficulty: true } },
      scenario: { select: { id: true, title: true, difficulty: true, scenarioType: true } },
      assignedUser: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
          email: true,
        },
      },
      cohort: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: 'desc' },
  });

  // Group by batchId
  const batches = {};
  const standalone = [];

  for (const a of assignments) {
    if (a.batchId) {
      if (!batches[a.batchId]) {
        batches[a.batchId] = {
          batchId: a.batchId,
          title: a.title,
          test: a.test,
          scenario: a.scenario,
          dueAt: a.dueAt,
          startAt: a.startAt,
          assignedAt: a.assignedAt,
          assignments: [],
        };
      }
      batches[a.batchId].assignments.push(a);
    } else {
      standalone.push(a);
    }
  }

  return {
    batches: Object.values(batches),
    standalone,
  };
}

export async function getAssignmentBatch(batchId, mentorId) {
  const assignments = await prisma.testAssignment.findMany({
    where: { batchId, assignedBy: mentorId },
    include: {
      test: { select: { id: true, title: true, topic: true, difficulty: true } },
      scenario: { select: { id: true, title: true, difficulty: true } },
      assignedUser: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });

  if (assignments.length === 0) throw createError(404, 'Assignment batch not found.');

  // Fetch attempt progress for each student
  const studentIds = assignments.map(a => a.assignedTo).filter(Boolean);
  const testId = assignments[0].testId;

  let attemptMap = {};
  if (testId && studentIds.length) {
    const attempts = await prisma.testAttempt.findMany({
      where: { testId, userId: { in: studentIds } },
      select: { userId: true, status: true, score: true, percentage: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    });
    for (const a of attempts) {
      if (!attemptMap[a.userId]) attemptMap[a.userId] = a;
    }
  }

  return assignments.map(a => ({
    ...a,
    attempt: a.assignedTo ? (attemptMap[a.assignedTo] ?? null) : null,
  }));
}
