import prisma from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';

async function getInstituteProfile(userId) {
  const profile = await prisma.instituteProfile.findUnique({ where: { userId } });
  if (!profile) throw createError(403, 'Institute profile not found.');
  return profile;
}

export async function getCohorts(userId) {
  const profile = await getInstituteProfile(userId);
  return prisma.cohort.findMany({
    where: { instituteId: profile.id, isActive: true },
    include: {
      _count: { select: { members: true } },
      invitations: { select: { id: true, code: true, status: true, usedCount: true, maxUses: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createCohort(userId, { name, description }) {
  if (!name?.trim()) throw createError(400, 'name is required.');
  const profile = await getInstituteProfile(userId);
  return prisma.cohort.create({
    data: { name: name.trim(), description: description ?? null, instituteId: profile.id },
  });
}

export async function deleteCohort(userId, cohortId) {
  const profile = await getInstituteProfile(userId);
  const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, instituteId: profile.id } });
  if (!cohort) throw createError(404, 'Cohort not found.');
  return prisma.cohort.update({ where: { id: cohortId }, data: { isActive: false } });
}

export async function getCohortMembers(userId, cohortId) {
  const profile = await getInstituteProfile(userId);
  const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, instituteId: profile.id } });
  if (!cohort) throw createError(404, 'Cohort not found.');

  return prisma.cohortMember.findMany({
    where: { cohortId },
    include: {
      cohort: { select: { name: true } },
    },
  }).then(async (members) => {
    // Enrich with user profile
    const userIds = members.map(m => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, role: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    return members.map(m => ({ ...m, user: userMap[m.userId] ?? null }));
  });
}

export async function getInstituteStudents(userId) {
  // All students connected to the institute account via MentorStudentConnection
  return prisma.mentorStudentConnection.findMany({
    where: { mentorId: userId, status: 'ACTIVE' },
    include: {
      student: {
        select: {
          id: true, email: true, role: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { connectedAt: 'desc' },
  });
}
