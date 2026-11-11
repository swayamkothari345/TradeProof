import prisma from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

export async function createInvitation(mentorId, { cohortId, maxUses, expiresAt } = {}) {
  // Verify mentor role
  const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
  if (!mentor || !['MENTOR', 'INSTITUTE'].includes(mentor.role)) {
    throw createError(403, 'Only mentors and institutes can create invitations.');
  }

  const code = crypto.randomBytes(6).toString('hex').toUpperCase();

  return prisma.invitation.create({
    data: {
      mentorId,
      code,
      cohortId: cohortId ?? null,
      maxUses: maxUses ?? 1,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
}

export async function acceptInvitation(studentId, code) {
  const invitation = await prisma.invitation.findUnique({ where: { code } });
  if (!invitation) throw createError(404, 'Invalid invitation code.');
  if (invitation.status === 'REVOKED') throw createError(400, 'This invitation has been revoked.');
  if (invitation.status === 'EXPIRED') throw createError(400, 'This invitation has expired.');
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
    throw createError(400, 'This invitation has expired.');
  }
  if (invitation.usedCount >= invitation.maxUses) {
    throw createError(400, 'This invitation has reached its maximum uses.');
  }

  // Check not already connected
  const existing = await prisma.mentorStudentConnection.findFirst({
    where: { mentorId: invitation.mentorId, studentId, status: 'ACTIVE' },
  });
  if (existing) throw createError(409, 'You are already connected to this mentor.');

  const result = await prisma.$transaction(async (tx) => {
    const connection = await tx.mentorStudentConnection.create({
      data: {
        mentorId: invitation.mentorId,
        studentId,
        invitationId: invitation.id,
        status: 'ACTIVE',
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        usedCount: { increment: 1 },
        status: invitation.usedCount + 1 >= invitation.maxUses ? 'ACCEPTED' : 'PENDING',
      },
    });

    // Add to cohort if specified
    if (invitation.cohortId) {
      await tx.cohortMember.upsert({
        where: { cohortId_userId: { cohortId: invitation.cohortId, userId: studentId } },
        update: {},
        create: { cohortId: invitation.cohortId, userId: studentId },
      });
    }

    // Notify mentor
    await tx.notification.create({
      data: {
        userId: invitation.mentorId,
        type: 'INVITATION',
        title: 'New student joined',
        message: `A student has accepted your invitation.`,
        referenceId: connection.id,
      },
    });

    return connection;
  });

  return result;
}

export async function getConnections(userId, role) {
  if (role === 'MENTOR' || role === 'INSTITUTE') {
    return prisma.mentorStudentConnection.findMany({
      where: { mentorId: userId, status: 'ACTIVE' },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        invitation: { select: { code: true } },
      },
      orderBy: { connectedAt: 'desc' },
    });
  }

  return prisma.mentorStudentConnection.findMany({
    where: { studentId: userId, status: 'ACTIVE' },
    include: {
      mentor: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          mentorProfile: { select: { specialisation: true } },
        },
      },
    },
    orderBy: { connectedAt: 'desc' },
  });
}

export async function revokeConnection(userId, role, connectionId) {
  const connection = await prisma.mentorStudentConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) throw createError(404, 'Connection not found.');

  // Both mentor and student can revoke
  if (connection.mentorId !== userId && connection.studentId !== userId) {
    throw createError(403, 'You cannot revoke this connection.');
  }

  return prisma.mentorStudentConnection.update({
    where: { id: connectionId },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });
}

export async function getInvitations(mentorId) {
  return prisma.invitation.findMany({
    where: { mentorId },
    orderBy: { createdAt: 'desc' },
  });
}

// Mentor viewing student data (with permission check)
export async function getStudentJournal(mentorId, studentId, query) {
  const connection = await prisma.mentorStudentConnection.findFirst({
    where: { mentorId, studentId, status: 'ACTIVE' },
  });
  if (!connection) throw createError(403, 'You do not have an active connection with this student.');

  const perms = connection.permissions;
  if (!perms?.viewJournal) throw createError(403, 'Student has not granted journal access.');

  const { getEntries } = await import('./journal.service.js');
  return getEntries(studentId, query);
}

export async function getStudentFindings(mentorId, studentId) {
  const connection = await prisma.mentorStudentConnection.findFirst({
    where: { mentorId, studentId, status: 'ACTIVE' },
  });
  if (!connection) throw createError(403, 'You do not have an active connection with this student.');

  const perms = connection.permissions;
  if (!perms?.viewFindings) throw createError(403, 'Student has not granted findings access.');

  const { getFindings } = await import('./rules.service.js');
  return getFindings(studentId);
}
