import { Router, Request, Response } from 'express';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { notifications } from '../../db/schema.js';
import { errors, sendError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(desc(notifications.createdAt)).limit(100);
    res.json({ success: true, data: list });
  } catch (err) {
    sendError(res, err);
  }
});

notificationsRouter.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const [notification] = await db.update(notifications).set({ readAt: new Date() })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user!.id)))
      .returning();
    if (!notification) throw errors.notFound('Notification not found.');
    res.json({ success: true, data: notification });
  } catch (err) {
    sendError(res, err);
  }
});

notificationsRouter.post('/read-all', async (req: Request, res: Response) => {
  try {
    const updated = await db.update(notifications).set({ readAt: new Date() })
      .where(and(eq(notifications.userId, req.user!.id), isNull(notifications.readAt)))
      .returning({ id: notifications.id });
    res.json({ success: true, data: { updated: updated.length } });
  } catch (err) {
    sendError(res, err);
  }
});
