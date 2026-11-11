import prisma from '../config/database.js';
import { success } from '../utils/response.js';

export async function getNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return success(res, notifications);
  } catch (err) { next(err); }
}

export async function markRead(req, res, next) {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true },
    });
    return success(res, {}, 'Marked as read.');
  } catch (err) { next(err); }
}

export async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    return success(res, {}, 'All notifications marked as read.');
  } catch (err) { next(err); }
}
