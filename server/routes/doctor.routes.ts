import { Router, Response } from 'express';
import crypto from 'crypto';
import { execute, queryOne, queryAll } from '../db.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.js';
import { sendDoctorVerificationAlertToAdmin } from '../email.js';

const router = Router();

/**
 * Search and filter APPROVED doctors
 * Patients can only see status = 'approved'
 */
router.get('/search', (req, res): void => {
  try {
    const { q, specialization, mode, maxFee } = req.query;

    let sql = `
      SELECT 
        u.id,
        u.full_name,
        u.profile_photo,
        u.email,
        u.phone,
        d.qualification,
        d.specialization,
        d.registration_number,
        d.experience_years,
        d.hospital_name,
        d.address,
        d.consultation_fee,
        d.consultation_modes,
        d.status,
        d.bio,
        d.rating,
        d.review_count
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.status = 'approved'
    `;

    const params: any[] = [];

    if (q && typeof q === 'string' && q.trim()) {
      sql += ` AND (u.full_name LIKE ? OR d.hospital_name LIKE ? OR d.address LIKE ? OR d.specialization LIKE ?)`;
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    if (specialization && typeof specialization === 'string' && specialization !== 'All') {
      sql += ` AND d.specialization = ?`;
      params.push(specialization);
    }

    if (maxFee && typeof maxFee === 'string' && !isNaN(Number(maxFee))) {
      sql += ` AND d.consultation_fee <= ?`;
      params.push(Number(maxFee));
    }

    sql += ` ORDER BY d.rating DESC, d.experience_years DESC`;

    const doctors = queryAll<any>(sql, params).map(doc => {
      let modes: string[] = ['video', 'in_person'];
      try {
        modes = JSON.parse(doc.consultation_modes);
      } catch (_) {}

      return {
        id: doc.id,
        fullName: doc.full_name,
        profilePhoto: doc.profile_photo,
        qualification: doc.qualification,
        specialization: doc.specialization,
        registrationNumber: doc.registration_number,
        experienceYears: doc.experience_years,
        hospitalName: doc.hospital_name,
        address: doc.address,
        consultationFee: doc.consultation_fee,
        consultationModes: modes,
        status: doc.status,
        bio: doc.bio,
        rating: doc.rating,
        reviewCount: doc.review_count,
      };
    });

    // Filter by consultation mode if provided
    let filtered = doctors;
    if (mode && typeof mode === 'string' && mode !== 'all') {
      filtered = doctors.filter(doc => doc.consultationModes.includes(mode));
    }

    res.json({ doctors: filtered });
  } catch (err: any) {
    console.error('search doctors error:', err);
    res.status(500).json({ error: 'Failed to search doctors.' });
  }
});

/**
 * Get single doctor profile and weekly schedule
 */
router.get('/:id', (req, res): void => {
  try {
    const doctorId = req.params.id;
    const doc = queryOne<any>(
      `SELECT 
        u.id,
        u.full_name,
        u.profile_photo,
        u.email,
        u.phone,
        d.qualification,
        d.specialization,
        d.registration_number,
        d.experience_years,
        d.hospital_name,
        d.address,
        d.consultation_fee,
        d.consultation_modes,
        d.status,
        d.bio,
        d.rating,
        d.review_count
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.user_id = ?`,
      [doctorId]
    );

    if (!doc) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    const availability = queryAll<any>(
      `SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, consultation_modes, is_active
       FROM doctor_availability
       WHERE doctor_id = ? AND is_active = 1
       ORDER BY day_of_week ASC`,
      [doctorId]
    );

    let modes: string[] = ['video', 'in_person'];
    try {
      modes = JSON.parse(doc.consultation_modes);
    } catch (_) {}

    res.json({
      doctor: {
        id: doc.id,
        fullName: doc.full_name,
        profilePhoto: doc.profile_photo,
        qualification: doc.qualification,
        specialization: doc.specialization,
        registrationNumber: doc.registration_number,
        experienceYears: doc.experience_years,
        hospitalName: doc.hospital_name,
        address: doc.address,
        consultationFee: doc.consultation_fee,
        consultationModes: modes,
        status: doc.status,
        bio: doc.bio,
        rating: doc.rating,
        reviewCount: doc.review_count,
        availability: availability.map(a => {
          let aModes = ['video'];
          try { aModes = JSON.parse(a.consultation_modes); } catch (_) {}
          return {
            id: a.id,
            dayOfWeek: a.day_of_week,
            startTime: a.start_time,
            endTime: a.end_time,
            slotDurationMinutes: a.slot_duration_minutes,
            consultationModes: aModes,
            isActive: a.is_active === 1,
          };
        }),
      },
    });
  } catch (err: any) {
    console.error('get doctor details error:', err);
    res.status(500).json({ error: 'Failed to retrieve doctor details.' });
  }
});

/**
 * Doctor submits/re-submits verification details
 */
router.post('/submit-verification', requireAuth, requireRole(['doctor']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doctorId = req.user!.userId;
    const {
      qualification,
      specialization,
      registrationNumber,
      experienceYears,
      hospitalName,
      address,
      consultationFee,
      consultationModes,
      bio,
    } = req.body;

    if (!qualification || !specialization || !registrationNumber || !hospitalName) {
      res.status(400).json({ error: 'All primary verification credentials are required.' });
      return;
    }

    const now = new Date().toISOString();

    // Check if doctor record exists
    const existing = queryOne<any>('SELECT * FROM doctors WHERE user_id = ?', [doctorId]);
    if (existing) {
      execute(
        `UPDATE doctors 
         SET qualification = ?,
             specialization = ?,
             registration_number = ?,
             experience_years = ?,
             hospital_name = ?,
             address = ?,
             consultation_fee = ?,
             consultation_modes = ?,
             status = 'pending',
             bio = ?,
             updated_at = ?
         WHERE user_id = ?`,
        [
          qualification,
          specialization,
          registrationNumber,
          Number(experienceYears) || 1,
          hospitalName,
          address || 'Hospital Address',
          Number(consultationFee) || 500,
          JSON.stringify(consultationModes || ['video', 'in_person']),
          bio || '',
          now,
          doctorId,
        ]
      );
    } else {
      execute(
        `INSERT INTO doctors (user_id, qualification, specialization, registration_number, experience_years, hospital_name, address, consultation_fee, consultation_modes, status, bio, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          doctorId,
          qualification,
          specialization,
          registrationNumber,
          Number(experienceYears) || 1,
          hospitalName,
          address || 'Hospital Address',
          Number(consultationFee) || 500,
          JSON.stringify(consultationModes || ['video', 'in_person']),
          bio || '',
          now,
          now,
        ]
      );
    }

    // Create admin token
    const adminToken = crypto.randomBytes(24).toString('hex');
    const requestId = crypto.randomUUID();
    execute(
      `INSERT INTO doctor_verification_requests (id, doctor_id, admin_token, status, submitted_at)
       VALUES (?, ?, ?, 'pending', ?)`,
      [requestId, doctorId, adminToken, now]
    );

    const user = queryOne<any>('SELECT * FROM users WHERE id = ?', [doctorId]);

    // Send admin review email to Prashant Chaturvedi
    sendDoctorVerificationAlertToAdmin({
      fullName: user?.full_name || 'Medical Doctor',
      email: user?.email || 'doctor@example.com',
      phone: user?.phone || 'Not provided',
      qualification,
      specialization,
      registrationNumber,
      experienceYears: Number(experienceYears) || 1,
      hospitalName,
      consultationFee: Number(consultationFee) || 500,
      adminToken,
    }).catch(e => console.error('Admin email trigger error:', e));

    res.json({
      success: true,
      message: 'Verification credentials submitted successfully. Admin review is pending.',
      adminToken,
    });
  } catch (err: any) {
    console.error('submit verification error:', err);
    res.status(500).json({ error: 'Failed to submit verification details.' });
  }
});

/**
 * Doctor manages their weekly availability
 */
router.get('/me/availability', requireAuth, requireRole(['doctor']), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const doctorId = req.user!.userId;
    const availability = queryAll<any>(
      `SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, consultation_modes, is_active
       FROM doctor_availability
       WHERE doctor_id = ?
       ORDER BY day_of_week ASC`,
      [doctorId]
    );

    res.json({
      availability: availability.map(a => {
        let modes = ['video', 'in_person'];
        try { modes = JSON.parse(a.consultation_modes); } catch (_) {}
        return {
          id: a.id,
          dayOfWeek: a.day_of_week,
          startTime: a.start_time,
          endTime: a.end_time,
          slotDurationMinutes: a.slot_duration_minutes,
          consultationModes: modes,
          isActive: a.is_active === 1,
        };
      }),
    });
  } catch (err: any) {
    console.error('get availability error:', err);
    res.status(500).json({ error: 'Failed to fetch doctor availability.' });
  }
});

router.put('/me/availability', requireAuth, requireRole(['doctor']), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const doctorId = req.user!.userId;
    const { schedule } = req.body; // array of { dayOfWeek, startTime, endTime, slotDurationMinutes, consultationModes, isActive }

    if (!Array.isArray(schedule)) {
      res.status(400).json({ error: 'Schedule must be an array of day slots.' });
      return;
    }

    // Delete existing availability and re-insert
    execute(`DELETE FROM doctor_availability WHERE doctor_id = ?`, [doctorId]);

    for (const item of schedule) {
      if (typeof item.dayOfWeek === 'number' && item.startTime && item.endTime) {
        execute(
          `INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, consultation_modes, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            doctorId,
            item.dayOfWeek,
            item.startTime,
            item.endTime,
            item.slotDurationMinutes || 30,
            JSON.stringify(item.consultationModes || ['video', 'in_person']),
            item.isActive ? 1 : 0,
          ]
        );
      }
    }

    res.json({ success: true, message: 'Availability schedule saved.' });
  } catch (err: any) {
    console.error('save availability error:', err);
    res.status(500).json({ error: 'Failed to update availability schedule.' });
  }
});

export default router;
