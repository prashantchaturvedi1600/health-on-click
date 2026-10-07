import { Router, Request, Response } from 'express';
import { execute, queryOne, queryAll } from '../db.js';
import { sendDoctorApprovedEmail, sendDoctorRejectedEmail } from '../email.js';

const router = Router();

/**
 * Review doctor application by secure admin token (from email link)
 */
router.get('/review-token/:token', (req: Request, res: Response): void => {
  try {
    const token = req.params.token;
    if (!token) {
      res.status(400).json({ error: 'Admin review token is required.' });
      return;
    }

    const request = queryOne<any>(
      `SELECT 
        r.id AS request_id,
        r.admin_token,
        r.status AS request_status,
        r.submitted_at,
        r.reviewed_at,
        r.admin_notes,
        d.user_id AS doctor_id,
        d.qualification,
        d.specialization,
        d.registration_number,
        d.experience_years,
        d.hospital_name,
        d.address,
        d.consultation_fee,
        d.consultation_modes,
        d.status AS doctor_status,
        d.bio,
        u.full_name,
        u.email,
        u.phone,
        u.profile_photo,
        u.created_at AS user_created_at
       FROM doctor_verification_requests r
       JOIN doctors d ON r.doctor_id = d.user_id
       JOIN users u ON d.user_id = u.id
       WHERE r.admin_token = ?`,
      [token]
    );

    if (!request) {
      res.status(404).json({ error: 'Verification request not found or invalid token.' });
      return;
    }

    let modes = ['video', 'in_person'];
    try {
      modes = JSON.parse(request.consultation_modes);
    } catch (_) {}

    res.json({
      request: {
        requestId: request.request_id,
        adminToken: request.admin_token,
        status: request.request_status,
        submittedAt: request.submitted_at,
        reviewedAt: request.reviewed_at,
        adminNotes: request.admin_notes,
        doctor: {
          id: request.doctor_id,
          fullName: request.full_name,
          email: request.email,
          phone: request.phone,
          profilePhoto: request.profile_photo,
          qualification: request.qualification,
          specialization: request.specialization,
          registrationNumber: request.registration_number,
          experienceYears: request.experience_years,
          hospitalName: request.hospital_name,
          address: request.address,
          consultationFee: request.consultation_fee,
          consultationModes: modes,
          status: request.doctor_status,
          bio: request.bio,
        },
      },
    });
  } catch (err: any) {
    console.error('get review token error:', err);
    res.status(500).json({ error: 'Failed to retrieve application details.' });
  }
});

/**
 * Admin action (Approve or Reject) using secure token
 */
router.post('/action-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, action, notes, rejectionReason } = req.body;

    if (!token || !action || !['approve', 'reject'].includes(action)) {
      res.status(400).json({ error: 'Valid token and action (approve or reject) are required.' });
      return;
    }

    const request = queryOne<any>(
      `SELECT r.*, d.user_id, u.full_name, u.email 
       FROM doctor_verification_requests r
       JOIN doctors d ON r.doctor_id = d.user_id
       JOIN users u ON d.user_id = u.id
       WHERE r.admin_token = ?`,
      [token]
    );

    if (!request) {
      res.status(404).json({ error: 'Invalid verification token.' });
      return;
    }

    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 1. Update doctor status
    execute(
      `UPDATE doctors 
       SET status = ?, rejection_reason = ?, updated_at = ? 
       WHERE user_id = ?`,
      [newStatus, action === 'reject' ? (rejectionReason || notes || 'Documentation incomplete') : null, now, request.doctor_id]
    );

    // 2. Update verification request record
    execute(
      `UPDATE doctor_verification_requests 
       SET status = ?, admin_notes = ?, reviewed_at = ?, reviewed_by = 'prashant37chaturvedi@gmail.com' 
       WHERE id = ?`,
      [newStatus, notes || rejectionReason || null, now, request.id]
    );

    // 3. Send email and in-app notification to the doctor
    if (action === 'approve') {
      if (request.email) {
        sendDoctorApprovedEmail(request.email, request.full_name).catch(e => console.error('Doctor approved email error:', e));
      }
      execute(
        `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
         VALUES (?, ?, 'doctor_approved', 'Account Approved!', 'Your doctor account has been approved by the administrator. You are now visible to patients.', '/doctor/dashboard', 0, ?)`,
        [crypto.randomUUID(), request.doctor_id, now]
      );
    } else {
      if (request.email) {
        sendDoctorRejectedEmail(request.email, request.full_name, rejectionReason || notes).catch(e => console.error('Doctor rejected email error:', e));
      }
      execute(
        `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
         VALUES (?, ?, 'doctor_rejected', 'Verification Notice', ?, '/doctor/verification', 0, ?)`,
        [
          crypto.randomUUID(),
          request.doctor_id,
          `Your verification application was not approved. Reason: ${rejectionReason || notes || 'Requirements not met'}`,
          now,
        ]
      );
    }

    res.json({
      success: true,
      message: `Doctor ${request.full_name} has been ${newStatus}.`,
      status: newStatus,
    });
  } catch (err: any) {
    console.error('admin action error:', err);
    res.status(500).json({ error: 'Failed to process admin verification action.' });
  }
});

/**
 * List all pending doctor verification requests
 */
router.get('/pending-requests', (_req: Request, res: Response): void => {
  try {
    const list = queryAll<any>(
      `SELECT 
        r.id AS request_id,
        r.admin_token,
        r.status,
        r.submitted_at,
        d.user_id AS doctor_id,
        d.qualification,
        d.specialization,
        d.registration_number,
        d.experience_years,
        d.hospital_name,
        d.consultation_fee,
        u.full_name,
        u.email,
        u.phone
       FROM doctor_verification_requests r
       JOIN doctors d ON r.doctor_id = d.user_id
       JOIN users u ON d.user_id = u.id
       ORDER BY r.submitted_at DESC`
    );

    res.json({ requests: list });
  } catch (err: any) {
    console.error('get pending requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve requests.' });
  }
});

export default router;
