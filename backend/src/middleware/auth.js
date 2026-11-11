import { verifyAccessToken } from '../utils/jwt.js';
import { createError } from './errorHandler.js';
import prisma from '../config/database.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError(401, 'Authentication required. Please log in.'));
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true, email: true },
    });

    if (!user || !user.isActive) {
      return next(createError(401, 'Account not found or deactivated.'));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError(401, 'Session expired. Please log in again.'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(createError(401, 'Invalid token.'));
    }
    next(err);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'You do not have permission to access this resource.'));
    }
    next();
  };
}

// Confirm that the userId in params matches the authenticated user
// (or allow if the user is a mentor with an active connection)
export function ownResource(req, res, next) {
  const targetId = req.params.userId || req.params.studentId;
  if (req.user.id === targetId) return next();
  return next(createError(403, 'Access denied.'));
}
