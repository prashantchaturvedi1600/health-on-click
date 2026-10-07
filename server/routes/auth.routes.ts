import { Router, Response } from 'express';
import crypto from 'crypto';
import { execute, queryOne, queryAll } from '../db.js';
import { dispatchOtp, verifyOtpCode, signToken, requireAuth, AuthenticatedRequest } from '../auth.js';
import { sendDoctorVerificationAlertToAdmin } from '../email.js';

const router = Router();

/**
 * Send real OTP for phone or email authentication
 */
router.post('/send-otp', async (req, res): Promise<void> => {
  try {
    const { identifier, role } = req.body;
    if (!identifier || typeof identifier !== 'string' || identifier.trim().length < 4) {
      res.status(400).json({ error: 'Valid phone number or email is required.' });
      return;
    }
    const cleanId = identifier.trim();
    const userRole = role === 'doctor' ? 'doctor' : 'patient';

    const result = await dispatchOtp(cleanId, userRole);
    res.json(result);
  } catch (err: any) {
    console.error('send-otp error:', err);
    res.status(500).json({ error: 'Failed to dispatch verification code.' });
  }
});

/**
 * Verify OTP and login or register
 */
router.post('/verify-otp', async (req, res): Promise<void> => {
  try {
    const { identifier, otpCode, role, fullName, registrationData } = req.body;
    if (!identifier || !otpCode) {
      res.status(400).json({ error: 'Identifier and OTP code are required.' });
      return;
    }

    const cleanId = identifier.trim();
    const isValid = await verifyOtpCode(cleanId, otpCode.trim());
    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired verification code. Please check and try again.' });
      return;
    }

    const isEmail = cleanId.includes('@');
    const userRole = role === 'doctor' ? 'doctor' : 'patient';

    // Find existing user by email or phone
    let user = isEmail
      ? queryOne<any>('SELECT * FROM users WHERE email = ?', [cleanId])
      : queryOne<any>('SELECT * FROM users WHERE phone = ?', [cleanId]);

    const now = new Date().toISOString();

    if (!user) {
      // New user registration
      const newUserId = crypto.randomUUID();
      const userName = fullName && fullName.trim() ? fullName.trim() : (isEmail ? cleanId.split('@')[0] : `User ${cleanId.slice(-4)}`);
      const userEmail = isEmail ? cleanId : (registrationData?.email || null);
      const userPhone = !isEmail ? cleanId : (registrationData?.phone || null);

      execute(
        `INSERT INTO users (id, role, phone, email, full_name, auth_provider, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'otp', 'active', ?, ?)`,
        [newUserId, userRole, userPhone, userEmail, userName, now, now]
      );

      if (userRole === 'patient') {
        execute(
          `INSERT INTO patients (user_id, date_of_birth, gender, blood_group, address, emergency_contact, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newUserId,
            registrationData?.dateOfBirth || null,
            registrationData?.gender || null,
            registrationData?.bloodGroup || null,
            registrationData?.address || null,
            registrationData?.emergencyContact || null,
            now
          ]
        );
      } else if (userRole === 'doctor') {
        // Register doctor with pending status
        const regNumber = registrationData?.registrationNumber || `REG-${Date.now().toString().slice(-6)}`;
        execute(
          `INSERT INTO doctors (user_id, qualification, specialization, registration_number, experience_years, hospital_name, address, consultation_fee, consultation_modes, status, bio, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
          [
            newUserId,
            registrationData?.qualification || 'MBBS',
            registrationData?.specialization || 'General Physician',
            regNumber,
            registrationData?.experienceYears || 2,
            registrationData?.hospitalName || 'Health On Click Clinic',
            registrationData?.address || 'City Center Medical Center',
            registrationData?.consultationFee || 500,
            JSON.stringify(registrationData?.consultationModes || ['video', 'in_person']),
            registrationData?.bio || 'Dedicated medical professional.',
            now,
            now
          ]
        );

        // Create admin verification request token
        const adminToken = crypto.randomBytes(24).toString('hex');
        const requestId = crypto.randomUUID();
        execute(
          `INSERT INTO doctor_verification_requests (id, doctor_id, admin_token, status, submitted_at)
           VALUES (?, ?, ?, 'pending', ?)`,
          [requestId, newUserId, adminToken, now]
        );

        // Also create default weekly availability
        const defaultDays = [1, 2, 3, 4, 5]; // Mon to Fri
        for (const day of defaultDays) {
          execute(
            `INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, consultation_modes, is_active)
             VALUES (?, ?, ?, '09:00', '17:00', 30, '["video","in_person"]', 1)`,
            [crypto.randomUUID(), newUserId, day]
          );
        }

        // Send alert email to Prashant Chaturvedi
        sendDoctorVerificationAlertToAdmin({
          fullName: userName,
          email: userEmail || 'doctor@example.com',
          phone: userPhone || cleanId,
          qualification: registrationData?.qualification || 'MBBS',
          specialization: registrationData?.specialization || 'General Physician',
          registrationNumber: regNumber,
          experienceYears: registrationData?.experienceYears || 2,
          hospitalName: registrationData?.hospitalName || 'Clinic',
          consultationFee: registrationData?.consultationFee || 500,
          adminToken,
        }).catch(e => console.error('Error sending admin alert:', e));
      }

      user = queryOne<any>('SELECT * FROM users WHERE id = ?', [newUserId]);
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
    });

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profile_photo,
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

/**
 * Real Google Authentication
 */
router.post('/google-auth', async (req, res): Promise<void> => {
  try {
    const { email, fullName, photoUrl, role, registrationData } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Valid Google email is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const userRole = role === 'doctor' ? 'doctor' : 'patient';
    let user = queryOne<any>('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    const now = new Date().toISOString();

    if (!user) {
      const newUserId = crypto.randomUUID();
      const userName = fullName || cleanEmail.split('@')[0];

      execute(
        `INSERT INTO users (id, role, email, full_name, profile_photo, auth_provider, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'google', 'active', ?, ?)`,
        [newUserId, userRole, cleanEmail, userName, photoUrl || null, now, now]
      );

      if (userRole === 'patient') {
        execute(
          `INSERT INTO patients (user_id, date_of_birth, gender, blood_group, address, emergency_contact, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newUserId,
            registrationData?.dateOfBirth || null,
            registrationData?.gender || null,
            registrationData?.bloodGroup || null,
            registrationData?.address || null,
            registrationData?.emergencyContact || null,
            now
          ]
        );
      } else if (userRole === 'doctor') {
        const regNumber = registrationData?.registrationNumber || `REG-${Date.now().toString().slice(-6)}`;
        execute(
          `INSERT INTO doctors (user_id, qualification, specialization, registration_number, experience_years, hospital_name, address, consultation_fee, consultation_modes, status, bio, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
          [
            newUserId,
            registrationData?.qualification || 'MBBS, MD',
            registrationData?.specialization || 'Cardiologist',
            regNumber,
            registrationData?.experienceYears || 3,
            registrationData?.hospitalName || 'City Medical Care',
            registrationData?.address || 'Medical Enclave, Central City',
            registrationData?.consultationFee || 600,
            JSON.stringify(registrationData?.consultationModes || ['video', 'in_person']),
            registrationData?.bio || 'Experienced medical practitioner.',
            now,
            now
          ]
        );

        const adminToken = crypto.randomBytes(24).toString('hex');
        const requestId = crypto.randomUUID();
        execute(
          `INSERT INTO doctor_verification_requests (id, doctor_id, admin_token, status, submitted_at)
           VALUES (?, ?, ?, 'pending', ?)`,
          [requestId, newUserId, adminToken, now]
        );

        // Default availability
        for (const day of [1, 2, 3, 4, 5]) {
          execute(
            `INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, consultation_modes, is_active)
             VALUES (?, ?, ?, '09:00', '17:00', 30, '["video","in_person"]', 1)`,
            [crypto.randomUUID(), newUserId, day]
          );
        }

        sendDoctorVerificationAlertToAdmin({
          fullName: userName,
          email: cleanEmail,
          phone: registrationData?.phone || 'Not provided',
          qualification: registrationData?.qualification || 'MBBS, MD',
          specialization: registrationData?.specialization || 'Cardiologist',
          registrationNumber: regNumber,
          experienceYears: registrationData?.experienceYears || 3,
          hospitalName: registrationData?.hospitalName || 'City Medical Care',
          consultationFee: registrationData?.consultationFee || 600,
          adminToken,
        }).catch(e => console.error('Error sending admin alert:', e));
      }

      user = queryOne<any>('SELECT * FROM users WHERE id = ?', [newUserId]);
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
    });

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profile_photo,
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error('google-auth error:', err);
    res.status(500).json({ error: 'Failed to process Google authentication.' });
  }
});

/**
 * Get current authenticated user profile
 */
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = queryOne<any>('SELECT * FROM users WHERE id = ?', [req.user!.userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    let extraProfile: any = null;
    if (user.role === 'patient') {
      extraProfile = queryOne<any>('SELECT * FROM patients WHERE user_id = ?', [user.id]);
    } else if (user.role === 'doctor') {
      extraProfile = queryOne<any>('SELECT * FROM doctors WHERE user_id = ?', [user.id]);
      if (extraProfile && extraProfile.consultation_modes) {
        try {
          extraProfile.consultation_modes = JSON.parse(extraProfile.consultation_modes);
        } catch (_) {}
      }
    }

    res.json({
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profile_photo,
        status: user.status,
        createdAt: user.created_at,
      },
      profile: extraProfile,
    });
  } catch (err: any) {
    console.error('get me error:', err);
    res.status(500).json({ error: 'Failed to fetch current user profile.' });
  }
});

/**
 * Update user profile
 */
router.put('/update-profile', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const { fullName, phone, email, profilePhoto, patientData, doctorData } = req.body;

    const user = queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    execute(
      `UPDATE users 
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           profile_photo = COALESCE(?, profile_photo),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [fullName || null, phone || null, email || null, profilePhoto || null, userId]
    );

    if (user.role === 'patient' && patientData) {
      execute(
        `UPDATE patients
         SET date_of_birth = COALESCE(?, date_of_birth),
             gender = COALESCE(?, gender),
             blood_group = COALESCE(?, blood_group),
             address = COALESCE(?, address),
             emergency_contact = COALESCE(?, emergency_contact)
         WHERE user_id = ?`,
        [
          patientData.dateOfBirth || null,
          patientData.gender || null,
          patientData.bloodGroup || null,
          patientData.address || null,
          patientData.emergencyContact || null,
          userId
        ]
      );
    } else if (user.role === 'doctor' && doctorData) {
      execute(
        `UPDATE doctors
         SET qualification = COALESCE(?, qualification),
             specialization = COALESCE(?, specialization),
             experience_years = COALESCE(?, experience_years),
             hospital_name = COALESCE(?, hospital_name),
             address = COALESCE(?, address),
             consultation_fee = COALESCE(?, consultation_fee),
             consultation_modes = COALESCE(?, consultation_modes),
             bio = COALESCE(?, bio),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [
          doctorData.qualification || null,
          doctorData.specialization || null,
          doctorData.experienceYears || null,
          doctorData.hospitalName || null,
          doctorData.address || null,
          doctorData.consultationFee || null,
          doctorData.consultationModes ? JSON.stringify(doctorData.consultationModes) : null,
          doctorData.bio || null,
          userId
        ]
      );
    }

    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err: any) {
    console.error('update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
