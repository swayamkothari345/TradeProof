import prisma from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { createError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

export async function registerUser({ email, password, role, firstName, lastName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw createError(409, 'An account with this email already exists.');

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        role,
        profile: {
          create: { firstName, lastName },
        },
      },
      include: { profile: true },
    });

    // Create role-specific profile
    if (role === 'STUDENT') {
      await tx.studentProfile.create({ data: { userId: newUser.id } });
    } else if (role === 'TRADER') {
      await tx.traderProfile.create({ data: { userId: newUser.id } });
    } else if (role === 'MENTOR') {
      await tx.mentorProfile.create({ data: { userId: newUser.id } });
    } else if (role === 'INSTITUTE') {
      // instituteName required; use firstName + lastName as placeholder
      await tx.instituteProfile.create({
        data: { userId: newUser.id, instituteName: `${firstName} ${lastName}` },
      });
    }

    // Create default risk preferences
    await tx.riskPreference.create({
      data: { userId: newUser.id, isDefault: true },
    });

    // Create default virtual portfolio
    await tx.virtualPortfolio.create({
      data: {
        userId: newUser.id,
        name: 'Demo Portfolio',
        portfolioType: 'DEMO',
      },
    });

    return newUser;
  });

  const tokens = await _issueTokens(user);
  return { user: _sanitize(user), tokens };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });
  if (!user) throw createError(401, 'Invalid email or password.');
  if (!user.isActive) throw createError(401, 'This account has been deactivated.');

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw createError(401, 'Invalid email or password.');

  const tokens = await _issueTokens(user);
  return { user: _sanitize(user), tokens };
}

export async function refreshUserTokens(refreshTokenStr) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenStr);
  } catch {
    throw createError(401, 'Invalid or expired refresh token.');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenStr },
  });
  if (!storedToken || storedToken.revokedAt) {
    throw createError(401, 'Refresh token has been revoked.');
  }
  if (storedToken.expiresAt < new Date()) {
    throw createError(401, 'Refresh token has expired.');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { profile: true },
  });
  if (!user || !user.isActive) throw createError(401, 'Account not found or deactivated.');

  // Rotate refresh token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await _issueTokens(user);
  return { user: _sanitize(user), tokens };
}

export async function logoutUser(refreshTokenStr) {
  if (!refreshTokenStr) return;
  await prisma.refreshToken.updateMany({
    where: { token: refreshTokenStr, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      studentProfile: true,
      traderProfile: true,
      mentorProfile: true,
      instituteProfile: true,
    },
  });
  if (!user) throw createError(404, 'User not found.');
  return _sanitize(user);
}

export async function updateProfile(userId, data) {
  const { firstName, lastName, phone, city, state, bio, avatarUrl } = data;

  const updated = await prisma.userProfile.update({
    where: { userId },
    data: { firstName, lastName, phone, city, state, bio, avatarUrl },
  });
  return updated;
}

// ─── Private helpers ────────────────────────────────────────────────────────

async function _issueTokens(user) {
  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  return { accessToken, refreshToken };
}

function _sanitize(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
