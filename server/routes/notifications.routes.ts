import { Router, Response } from 'express';
import { execute, queryOne, queryAll } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

/**
 * Get all notifications for logged in user
 */
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const notifications = queryAll<any>(
      `SELECT id, type, title, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const unreadCount = queryOne<any>(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    )?.count || 0;

    res.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.is_read === 1,
        createdAt: n.created_at,
      })),
      unreadCount,
    });
  } catch (err: any) {
    console.error('get notifications error:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

/**
 * Mark single notification as read
 */
router.post('/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const notifId = req.params.id;

    execute(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [notifId, userId]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('mark notification read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

/**
 * Mark all notifications as read
 */
router.post('/read-all', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    execute(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

export default router;
