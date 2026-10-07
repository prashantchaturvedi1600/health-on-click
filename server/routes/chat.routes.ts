import { Router, Response } from 'express';
import crypto from 'crypto';
import { execute, queryOne, queryAll } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

/**
 * Get all conversations for current user
 */
router.get('/conversations', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let sql = '';
    if (userRole === 'doctor') {
      sql = `
        SELECT 
          c.id,
          c.patient_id,
          c.doctor_id,
          c.last_message_text,
          c.last_message_at,
          c.created_at,
          p_user.full_name AS other_user_name,
          p_user.profile_photo AS other_user_photo,
          p_user.role AS other_user_role,
          (
            SELECT COUNT(*) 
            FROM messages m 
            WHERE m.conversation_id = c.id AND m.receiver_id = ? AND m.is_read = 0
          ) AS unread_count
        FROM conversations c
        JOIN users p_user ON c.patient_id = p_user.id
        WHERE c.doctor_id = ?
        ORDER BY c.last_message_at DESC, c.created_at DESC
      `;
    } else {
      sql = `
        SELECT 
          c.id,
          c.patient_id,
          c.doctor_id,
          c.last_message_text,
          c.last_message_at,
          c.created_at,
          d_user.full_name AS other_user_name,
          d_user.profile_photo AS other_user_photo,
          d_user.role AS other_user_role,
          d.specialization AS other_user_sub,
          (
            SELECT COUNT(*) 
            FROM messages m 
            WHERE m.conversation_id = c.id AND m.receiver_id = ? AND m.is_read = 0
          ) AS unread_count
        FROM conversations c
        JOIN users d_user ON c.doctor_id = d_user.id
        LEFT JOIN doctors d ON c.doctor_id = d.user_id
        WHERE c.patient_id = ?
        ORDER BY c.last_message_at DESC, c.created_at DESC
      `;
    }

    const conversations = queryAll<any>(sql, [userId, userId]);
    res.json({ conversations });
  } catch (err: any) {
    console.error('get conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

/**
 * Get messages for a specific conversation (marks unread as read)
 */
router.get('/messages/:conversationId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user!.userId;

    const conv = queryOne<any>('SELECT * FROM conversations WHERE id = ?', [conversationId]);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    // Security check: Must be a participant in the conversation
    if (conv.patient_id !== userId && conv.doctor_id !== userId) {
      res.status(403).json({ error: 'You are not authorized to view messages in this conversation.' });
      return;
    }

    // Mark unread messages sent to this user as read
    execute(
      `UPDATE messages 
       SET is_read = 1 
       WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0`,
      [conversationId, userId]
    );

    // Fetch messages
    const messages = queryAll<any>(
      `SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.receiver_id,
        m.message_text,
        m.is_read,
        m.created_at,
        u.full_name AS sender_name,
        u.profile_photo AS sender_photo
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    res.json({ messages });
  } catch (err: any) {
    console.error('get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

/**
 * Send message
 */
router.post('/messages', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const { conversationId, recipientId, messageText } = req.body;

    if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
      res.status(400).json({ error: 'Message text cannot be empty.' });
      return;
    }

    let conv = conversationId ? queryOne<any>('SELECT * FROM conversations WHERE id = ?', [conversationId]) : null;

    if (!conv && recipientId) {
      // Find or create conversation with recipient
      const isSenderPatient = req.user!.role === 'patient';
      const patientId = isSenderPatient ? userId : recipientId;
      const doctorId = isSenderPatient ? recipientId : userId;

      // Verify relationship/appointment exists between patient and doctor
      const appointment = queryOne<any>(
        `SELECT id FROM appointments WHERE patient_id = ? AND doctor_id = ? LIMIT 1`,
        [patientId, doctorId]
      );

      if (!appointment) {
        res.status(403).json({ error: 'Communication is only allowed between patients and doctors with an appointment.' });
        return;
      }

      conv = queryOne<any>('SELECT * FROM conversations WHERE patient_id = ? AND doctor_id = ?', [patientId, doctorId]);
      if (!conv) {
        const newConvId = crypto.randomUUID();
        const now = new Date().toISOString();
        execute(
          `INSERT INTO conversations (id, patient_id, doctor_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [newConvId, patientId, doctorId, now, now]
        );
        conv = queryOne<any>('SELECT * FROM conversations WHERE id = ?', [newConvId]);
      }
    }

    if (!conv) {
      res.status(404).json({ error: 'Active conversation not found.' });
      return;
    }

    // Security check: Must be participant
    if (conv.patient_id !== userId && conv.doctor_id !== userId) {
      res.status(403).json({ error: 'You are not authorized to send messages in this conversation.' });
      return;
    }

    const receiverId = conv.patient_id === userId ? conv.doctor_id : conv.patient_id;
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();
    const trimmedText = messageText.trim();

    execute(
      `INSERT INTO messages (id, conversation_id, sender_id, receiver_id, message_text, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [messageId, conv.id, userId, receiverId, trimmedText, now]
    );

    // Update conversation last message
    execute(
      `UPDATE conversations 
       SET last_message_text = ?, last_message_at = ?, updated_at = ? 
       WHERE id = ?`,
      [trimmedText, now, now, conv.id]
    );

    // Trigger notification for recipient
    const sender = queryOne<any>('SELECT full_name FROM users WHERE id = ?', [userId]);
    execute(
      `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, 'chat_message', 'New Message', ?, '/chat', 0, ?)`,
      [
        crypto.randomUUID(),
        receiverId,
        `${sender?.full_name || 'Someone'} sent you a message: "${trimmedText.length > 40 ? trimmedText.slice(0, 40) + '...' : trimmedText}"`,
        now,
      ]
    );

    res.status(201).json({
      success: true,
      message: {
        id: messageId,
        conversationId: conv.id,
        senderId: userId,
        receiverId,
        messageText: trimmedText,
        isRead: false,
        createdAt: now,
      },
    });
  } catch (err: any) {
    console.error('send message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

export default router;
