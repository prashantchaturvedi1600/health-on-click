import { Router, Response } from 'express';
import crypto from 'crypto';
import { execute, queryOne, queryAll } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import {
  sendAppointmentRequestedEmail,
  sendAppointmentAcceptedEmail,
  sendAppointmentRejectedEmail,
} from '../email.js';

const router = Router();

/**
 * Generate 30-min time slots between start and end
 */
function generateTimeSlots(startTime: string, endTime: string, durationMinutes = 30): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinTotal = startHour * 60 + startMin;
  const endMinTotal = endHour * 60 + endMin;

  while (currentMinTotal + durationMinutes <= endMinTotal) {
    const sH = Math.floor(currentMinTotal / 60).toString().padStart(2, '0');
    const sM = (currentMinTotal % 60).toString().padStart(2, '0');
    const nextMinTotal = currentMinTotal + durationMinutes;
    const eH = Math.floor(nextMinTotal / 60).toString().padStart(2, '0');
    const eM = (nextMinTotal % 60).toString().padStart(2, '0');

    slots.push(`${sH}:${sM} - ${eH}:${eM}`);
    currentMinTotal = nextMinTotal;
  }

  return slots;
}

/**
 * Get available slots for a doctor on a specific date (real database check, prevents double booking)
 */
router.get('/available-slots', (req, res): void => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date || typeof doctorId !== 'string' || typeof date !== 'string') {
      res.status(400).json({ error: 'Doctor ID and date (YYYY-MM-DD) are required.' });
      return;
    }

    const targetDate = new Date(`${date}T12:00:00Z`);
    if (isNaN(targetDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }

    const dayOfWeek = targetDate.getUTCDay(); // 0 is Sunday, 1 is Monday...

    // 1. Get doctor's availability rule for this day
    const rule = queryOne<any>(
      `SELECT * FROM doctor_availability WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1`,
      [doctorId, dayOfWeek]
    );

    if (!rule) {
      res.json({
        available: false,
        message: 'Doctor does not hold consultations on this day.',
        slots: [],
      });
      return;
    }

    // 2. Generate slots
    const allSlots = generateTimeSlots(rule.start_time, rule.end_time, rule.slot_duration_minutes || 30);

    // 3. Query existing booked appointments
    const bookedAppointments = queryAll<any>(
      `SELECT time_slot FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('REJECTED', 'CANCELLED')`,
      [doctorId, date]
    );

    const bookedSlotsSet = new Set(bookedAppointments.map(a => a.time_slot));

    let modes = ['video', 'in_person'];
    try {
      modes = JSON.parse(rule.consultation_modes);
    } catch (_) {}

    const slotItems = allSlots.map(slot => ({
      slot,
      isAvailable: !bookedSlotsSet.has(slot),
      modes,
    }));

    res.json({
      available: true,
      dayOfWeek,
      workingHours: `${rule.start_time} - ${rule.end_time}`,
      modes,
      slots: slotItems,
    });
  } catch (err: any) {
    console.error('get available slots error:', err);
    res.status(500).json({ error: 'Failed to retrieve available slots.' });
  }
});

/**
 * Book appointment (Strict double-booking prevention)
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const patientId = req.user!.userId;
    const { doctorId, appointmentDate, timeSlot, consultationMode, symptomsNotes } = req.body;

    if (!doctorId || !appointmentDate || !timeSlot || !consultationMode) {
      res.status(400).json({ error: 'Doctor, date, time slot, and consultation mode are required.' });
      return;
    }

    // 1. Check doctor approval status
    const doctor = queryOne<any>(
      `SELECT d.*, u.full_name, u.email, u.phone 
       FROM doctors d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.user_id = ?`,
      [doctorId]
    );

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    if (doctor.status !== 'approved') {
      res.status(400).json({ error: 'Doctor is pending approval and cannot accept bookings yet.' });
      return;
    }

    // 2. Double booking prevention check
    const existingBooking = queryOne<any>(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status NOT IN ('REJECTED', 'CANCELLED')`,
      [doctorId, appointmentDate, timeSlot]
    );

    if (existingBooking) {
      res.status(409).json({ error: 'This time slot is already booked for this doctor. Please select another slot.' });
      return;
    }

    // 3. Create appointment
    const appointmentId = crypto.randomUUID();
    const now = new Date().toISOString();

    execute(
      `INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, time_slot, consultation_mode, symptoms_notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?, ?)`,
      [
        appointmentId,
        patientId,
        doctorId,
        appointmentDate,
        timeSlot,
        consultationMode,
        symptomsNotes || null,
        now,
        now,
      ]
    );

    // 4. Ensure conversation link exists for doctor-patient communication
    const existingConv = queryOne<any>(
      `SELECT id FROM conversations WHERE patient_id = ? AND doctor_id = ?`,
      [patientId, doctorId]
    );

    if (!existingConv) {
      execute(
        `INSERT INTO conversations (id, patient_id, doctor_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), patientId, doctorId, now, now]
      );
    }

    // 5. In-app notification for the doctor
    const patientUser = queryOne<any>('SELECT * FROM users WHERE id = ?', [patientId]);
    const patientName = patientUser?.full_name || 'A patient';

    execute(
      `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, 'appointment_request', ?, ?, ?, 0, ?)`,
      [
        crypto.randomUUID(),
        doctorId,
        'New Appointment Request',
        `${patientName} requested an appointment for ${appointmentDate} at ${timeSlot} (${consultationMode.toUpperCase()}).`,
        `/doctor/appointments`,
        now,
      ]
    );

    // 6. Real email trigger to doctor
    if (doctor.email) {
      sendAppointmentRequestedEmail(
        doctor.email,
        doctor.full_name,
        patientName,
        appointmentDate,
        timeSlot,
        consultationMode
      ).catch(e => console.error('Appointment request email error:', e));
    }

    res.status(201).json({
      success: true,
      message: 'Appointment requested successfully! The doctor will review your request.',
      appointmentId,
    });
  } catch (err: any) {
    console.error('book appointment error:', err);
    res.status(500).json({ error: 'Failed to create appointment.' });
  }
});

/**
 * List appointments for logged-in user
 */
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let sql = '';
    let params: any[] = [];

    if (userRole === 'doctor') {
      sql = `
        SELECT 
          a.id,
          a.patient_id,
          a.doctor_id,
          a.appointment_date,
          a.time_slot,
          a.consultation_mode,
          a.symptoms_notes,
          a.status,
          a.cancellation_reason,
          a.created_at,
          p_user.full_name AS patient_name,
          p_user.email AS patient_email,
          p_user.phone AS patient_phone,
          p_user.profile_photo AS patient_photo,
          p.gender AS patient_gender,
          p.date_of_birth AS patient_dob,
          p.blood_group AS patient_blood_group,
          p.emergency_contact AS patient_emergency_contact
        FROM appointments a
        JOIN users p_user ON a.patient_id = p_user.id
        LEFT JOIN patients p ON a.patient_id = p.user_id
        WHERE a.doctor_id = ?
        ORDER BY a.appointment_date DESC, a.time_slot DESC
      `;
      params = [userId];
    } else {
      sql = `
        SELECT 
          a.id,
          a.patient_id,
          a.doctor_id,
          a.appointment_date,
          a.time_slot,
          a.consultation_mode,
          a.symptoms_notes,
          a.status,
          a.cancellation_reason,
          a.created_at,
          d_user.full_name AS doctor_name,
          d_user.profile_photo AS doctor_photo,
          d_user.email AS doctor_email,
          d_user.phone AS doctor_phone,
          d.qualification AS doctor_qualification,
          d.specialization AS doctor_specialization,
          d.hospital_name AS doctor_hospital,
          d.consultation_fee AS doctor_fee
        FROM appointments a
        JOIN users d_user ON a.doctor_id = d_user.id
        JOIN doctors d ON a.doctor_id = d.user_id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC, a.time_slot DESC
      `;
      params = [userId];
    }

    const appointments = queryAll<any>(sql, params);
    res.json({ appointments });
  } catch (err: any) {
    console.error('get appointments error:', err);
    res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
});

/**
 * Update appointment status (Accept, Reject, Complete, Cancel)
 */
router.patch('/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { status, reason } = req.body;

    const validStatuses = ['ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const app = queryOne<any>(
      `SELECT a.*, 
              d_user.full_name AS doctor_name, d_user.email AS doctor_email,
              p_user.full_name AS patient_name, p_user.email AS patient_email
       FROM appointments a
       JOIN users d_user ON a.doctor_id = d_user.id
       JOIN users p_user ON a.patient_id = p_user.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (!app) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }

    // Role authorization checks
    if (userRole === 'doctor') {
      if (app.doctor_id !== userId) {
        res.status(403).json({ error: 'You are not authorized to update this appointment.' });
        return;
      }
    } else if (userRole === 'patient') {
      if (app.patient_id !== userId) {
        res.status(403).json({ error: 'You are not authorized to update this appointment.' });
        return;
      }
      // Patients can only cancel
      if (status !== 'CANCELLED') {
        res.status(403).json({ error: 'Patients can only cancel appointments.' });
        return;
      }
    }

    const now = new Date().toISOString();

    execute(
      `UPDATE appointments 
       SET status = ?, cancellation_reason = ?, updated_at = ? 
       WHERE id = ?`,
      [status, reason || null, now, appointmentId]
    );

    // Send notifications and emails based on new status
    if (status === 'ACCEPTED') {
      // In-app notification to patient
      execute(
        `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
         VALUES (?, ?, 'appointment_accepted', 'Appointment Accepted', ?, '/patient/appointments', 0, ?)`,
        [
          crypto.randomUUID(),
          app.patient_id,
          `Dr. ${app.doctor_name} has confirmed your appointment for ${app.appointment_date} at ${app.time_slot}.`,
          now,
        ]
      );

      if (app.patient_email) {
        sendAppointmentAcceptedEmail(
          app.patient_email,
          app.patient_name,
          app.doctor_name,
          app.appointment_date,
          app.time_slot,
          app.consultation_mode
        ).catch(e => console.error('Accept email error:', e));
      }
    } else if (status === 'REJECTED') {
      execute(
        `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
         VALUES (?, ?, 'appointment_rejected', 'Appointment Update', ?, '/patient/appointments', 0, ?)`,
        [
          crypto.randomUUID(),
          app.patient_id,
          `Dr. ${app.doctor_name} could not accept your appointment for ${app.appointment_date}. Reason: ${reason || 'Doctor unavailable'}`,
          now,
        ]
      );

      if (app.patient_email) {
        sendAppointmentRejectedEmail(
          app.patient_email,
          app.patient_name,
          app.doctor_name,
          app.appointment_date,
          app.time_slot,
          reason
        ).catch(e => console.error('Reject email error:', e));
      }
    } else if (status === 'CANCELLED') {
      const recipientId = userRole === 'doctor' ? app.patient_id : app.doctor_id;
      const cancelledByName = userRole === 'doctor' ? `Dr. ${app.doctor_name}` : app.patient_name;

      execute(
        `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
         VALUES (?, ?, 'appointment_cancelled', 'Appointment Cancelled', ?, ?, 0, ?)`,
        [
          crypto.randomUUID(),
          recipientId,
          `Appointment on ${app.appointment_date} was cancelled by ${cancelledByName}.${reason ? ` Reason: ${reason}` : ''}`,
          userRole === 'doctor' ? '/patient/appointments' : '/doctor/appointments',
          now,
        ]
      );
    }

    res.json({
      success: true,
      message: `Appointment status updated to ${status}.`,
    });
  } catch (err: any) {
    console.error('update appointment status error:', err);
    res.status(500).json({ error: 'Failed to update appointment status.' });
  }
});

export default router;
