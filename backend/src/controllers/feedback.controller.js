import prisma from '../config/database.js';
import { success, created } from '../utils/response.js';
import { createError } from '../middleware/errorHandler.js';

export async function giveFeedback(req, res, next) {
  try {
    const { studentId, content, feedbackType, referenceId } = req.body;
    if (!studentId || !content) return next(createError(400, 'studentId and content are required.'));

    // Verify active connection
    const connection = await prisma.mentorStudentConnection.findFirst({
      where: { mentorId: req.user.id, studentId, status: 'ACTIVE' },
    });
    if (!connection) return next(createError(403, 'No active connection with this student.'));

    const feedback = await prisma.feedback.create({
      data: {
        mentorId: req.user.id,
        studentId,
        content,
        feedbackType: feedbackType ?? 'GENERAL',
        referenceId,
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'FEEDBACK',
        title: 'New feedback from your mentor',
        message: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
        referenceId: feedback.id,
      },
    });

    return created(res, feedback, 'Feedback sent.');
  } catch (err) { next(err); }
}

export async function getMyFeedback(req, res, next) {
  try {
    const feedback = await prisma.feedback.findMany({
      where: { studentId: req.user.id },
      include: {
        mentor: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, feedback);
  } catch (err) { next(err); }
}
