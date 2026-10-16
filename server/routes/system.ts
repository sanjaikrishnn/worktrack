import { Router, Request, Response } from 'express';
import { db, User } from '../db.js';
import { requireAuth } from './auth.js';
import { eventBus } from '../events.js';
import crypto from 'crypto';

export const systemRouter = Router();

// SSE connection for live synchronization
systemRouter.get('/events', (req: Request, res: Response) => {
  const clientId = `client_${crypto.randomBytes(6).toString('hex')}`;
  const userId = req.query.userId as string | undefined;
  eventBus.addClient(clientId, res, userId);
});

// Notifications
systemRouter.get('/notifications', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const notifications = db.get('notifications');
  const userNotifs = notifications.filter((n) => n.userId === user.id);
  res.json({ notifications: userNotifs });
});

systemRouter.post('/notifications/:id/read', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const notifications = db.get('notifications');
  const notif = notifications.find((n) => n.id === id && n.userId === user.id);
  if (notif) {
    notif.read = true;
    db.set('notifications', notifications);
  }
  res.json({ success: true });
});

systemRouter.post('/notifications/read-all', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const notifications = db.get('notifications');
  for (const n of notifications) {
    if (n.userId === user.id) {
      n.read = true;
    }
  }
  db.set('notifications', notifications);
  res.json({ success: true });
});

// Audit logs (Manager/Admin only)
systemRouter.get('/audit-logs', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'manager' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Manager access required.' });
  }
  const auditLogs = db.get('auditLogs');
  res.json({ logs: auditLogs });
});

// Reset database to initial seed (for testing)
systemRouter.post('/reset-seed', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'manager' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permission required.' });
  }
  db.resetToSeed();
  eventBus.broadcast('DATA_RESET', {});
  res.json({ success: true, message: 'Database reset to initial sample state.' });
});
