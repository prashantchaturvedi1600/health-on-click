import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { execute, queryOne, queryAll } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads/medical_drive');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = crypto.randomUUID();
    cb(null, `${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

/**
 * Upload medical document to Medical Drive
 */
router.post('/upload', requireAuth, upload.single('file'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (userRole !== 'patient') {
      res.status(403).json({ error: 'Only patients can store personal documents in Medical Drive.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file was uploaded.' });
      return;
    }

    const { category, notes, customName } = req.body;
    const validCategories = ['lab_report', 'prescription', 'scan', 'discharge_summary', 'other'];
    const chosenCategory = validCategories.includes(category) ? category : 'other';

    const docId = crypto.randomUUID();
    const now = new Date().toISOString();
    const displayName = customName && customName.trim() ? customName.trim() : req.file.originalname;

    execute(
      `INSERT INTO medical_documents (id, patient_id, file_name, original_name, file_type, mime_type, file_size, storage_path, category, notes, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId,
        userId,
        displayName,
        req.file.originalname,
        path.extname(req.file.originalname).replace('.', '').toUpperCase() || 'FILE',
        req.file.mimetype,
        req.file.size,
        req.file.filename,
        chosenCategory,
        notes || null,
        now,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Medical document uploaded successfully to secure Medical Drive.',
      document: {
        id: docId,
        fileName: displayName,
        originalName: req.file.originalname,
        fileType: path.extname(req.file.originalname).replace('.', '').toUpperCase(),
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        category: chosenCategory,
        notes: notes || null,
        uploadedAt: now,
      },
    });
  } catch (err: any) {
    console.error('upload document error:', err);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

/**
 * List patient's medical documents with active share statuses
 */
router.get('/documents', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (userRole !== 'patient') {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const docs = queryAll<any>(
      `SELECT 
        d.id,
        d.file_name,
        d.original_name,
        d.file_type,
        d.mime_type,
        d.file_size,
        d.category,
        d.notes,
        d.uploaded_at
       FROM medical_documents d
       WHERE d.patient_id = ?
       ORDER BY d.uploaded_at DESC`,
      [userId]
    );

    // Fetch active shares for each document
    const formatted = docs.map(d => {
      const shares = queryAll<any>(
        `SELECT 
          s.id AS share_id,
          s.doctor_id,
          s.shared_at,
          u.full_name AS doctor_name,
          doc.specialization,
          doc.hospital_name
         FROM document_shares s
         JOIN users u ON s.doctor_id = u.id
         JOIN doctors doc ON s.doctor_id = doc.user_id
         WHERE s.document_id = ? AND s.is_active = 1`,
        [d.id]
      );

      return {
        id: d.id,
        fileName: d.file_name,
        originalName: d.original_name,
        fileType: d.file_type,
        mimeType: d.mime_type,
        fileSize: d.file_size,
        category: d.category,
        notes: d.notes,
        uploadedAt: d.uploaded_at,
        shares: shares.map(s => ({
          shareId: s.share_id,
          doctorId: s.doctor_id,
          doctorName: s.doctor_name,
          specialization: s.specialization,
          hospitalName: s.hospital_name,
          sharedAt: s.shared_at,
        })),
      };
    });

    res.json({ documents: formatted });
  } catch (err: any) {
    console.error('get documents error:', err);
    res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
});

/**
 * Share document with a specific doctor
 */
router.post('/share', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const { documentId, doctorId } = req.body;

    if (!documentId || !doctorId) {
      res.status(400).json({ error: 'Document ID and Doctor ID are required.' });
      return;
    }

    // Verify document belongs to this patient
    const doc = queryOne<any>('SELECT * FROM medical_documents WHERE id = ? AND patient_id = ?', [documentId, userId]);
    if (!doc) {
      res.status(404).json({ error: 'Document not found or unauthorized.' });
      return;
    }

    // Verify doctor exists and is approved
    const doctor = queryOne<any>('SELECT * FROM doctors WHERE user_id = ? AND status = ?', [doctorId, 'approved']);
    if (!doctor) {
      res.status(404).json({ error: 'Approved doctor not found.' });
      return;
    }

    const now = new Date().toISOString();

    // Check if existing share entry exists
    const existingShare = queryOne<any>('SELECT * FROM document_shares WHERE document_id = ? AND doctor_id = ?', [documentId, doctorId]);
    if (existingShare) {
      execute(
        `UPDATE document_shares SET is_active = 1, shared_at = ?, revoked_at = NULL WHERE id = ?`,
        [now, existingShare.id]
      );
    } else {
      execute(
        `INSERT INTO document_shares (id, document_id, patient_id, doctor_id, is_active, shared_at)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [crypto.randomUUID(), documentId, userId, doctorId, now]
      );
    }

    // Notify doctor
    const patientUser = queryOne<any>('SELECT full_name FROM users WHERE id = ?', [userId]);
    execute(
      `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, 'document_shared', 'Medical Document Shared', ?, '/doctor/shared-records', 0, ?)`,
      [
        crypto.randomUUID(),
        doctorId,
        `${patientUser?.full_name || 'Patient'} shared a medical document ("${doc.file_name}") with you.`,
        now,
      ]
    );

    res.json({ success: true, message: 'Document shared with doctor.' });
  } catch (err: any) {
    console.error('share document error:', err);
    res.status(500).json({ error: 'Failed to share document.' });
  }
});

/**
 * Revoke document access from a doctor
 */
router.post('/revoke', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.userId;
    const { documentId, doctorId } = req.body;

    if (!documentId || !doctorId) {
      res.status(400).json({ error: 'Document ID and Doctor ID are required.' });
      return;
    }

    // Check document ownership
    const doc = queryOne<any>('SELECT * FROM medical_documents WHERE id = ? AND patient_id = ?', [documentId, userId]);
    if (!doc) {
      res.status(404).json({ error: 'Document not found or unauthorized.' });
      return;
    }

    const now = new Date().toISOString();
    execute(
      `UPDATE document_shares 
       SET is_active = 0, revoked_at = ? 
       WHERE document_id = ? AND doctor_id = ?`,
      [now, documentId, doctorId]
    );

    res.json({ success: true, message: 'Doctor access to document revoked.' });
  } catch (err: any) {
    console.error('revoke share error:', err);
    res.status(500).json({ error: 'Failed to revoke access.' });
  }
});

/**
 * Doctor view: list documents shared with logged-in doctor
 */
router.get('/doctor-shared', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const doctorId = req.user!.userId;
    const userRole = req.user!.role;

    if (userRole !== 'doctor') {
      res.status(403).json({ error: 'Only doctors can access shared patient records.' });
      return;
    }

    const sharedDocs = queryAll<any>(
      `SELECT 
        d.id,
        d.file_name,
        d.original_name,
        d.file_type,
        d.mime_type,
        d.file_size,
        d.category,
        d.notes,
        d.uploaded_at,
        s.shared_at,
        u.full_name AS patient_name,
        u.id AS patient_id,
        p.gender,
        p.date_of_birth,
        p.blood_group
       FROM document_shares s
       JOIN medical_documents d ON s.document_id = d.id
       JOIN users u ON s.patient_id = u.id
       LEFT JOIN patients p ON s.patient_id = p.user_id
       WHERE s.doctor_id = ? AND s.is_active = 1
       ORDER BY s.shared_at DESC`,
      [doctorId]
    );

    res.json({ sharedDocuments: sharedDocs });
  } catch (err: any) {
    console.error('get doctor shared records error:', err);
    res.status(500).json({ error: 'Failed to retrieve shared documents.' });
  }
});

/**
 * Secure file stream / download with RBAC authorization
 * Only the owner patient OR a doctor with an active share record can access the file!
 */
router.get('/documents/:id/download', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const docId = req.params.id;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const doc = queryOne<any>('SELECT * FROM medical_documents WHERE id = ?', [docId]);
    if (!doc) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    // Check authorization:
    // 1. Is caller the patient owner?
    const isOwner = doc.patient_id === userId;

    // 2. If caller is doctor, do they have an ACTIVE share?
    let hasDoctorAccess = false;
    if (userRole === 'doctor') {
      const share = queryOne<any>(
        'SELECT id FROM document_shares WHERE document_id = ? AND doctor_id = ? AND is_active = 1',
        [docId, userId]
      );
      if (share) hasDoctorAccess = true;
    }

    if (!isOwner && !hasDoctorAccess) {
      res.status(403).json({
        error: 'Forbidden: You do not have permission to view or download this medical record. Access has either not been granted or was revoked by the patient.'
      });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, doc.storage_path);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File data is not present on disk.' });
      return;
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_name)}"`);
    res.sendFile(filePath);
  } catch (err: any) {
    console.error('download file error:', err);
    res.status(500).json({ error: 'Failed to access file.' });
  }
});

/**
 * Delete document from Medical Drive
 */
router.delete('/documents/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const docId = req.params.id;
    const userId = req.user!.userId;

    const doc = queryOne<any>('SELECT * FROM medical_documents WHERE id = ? AND patient_id = ?', [docId, userId]);
    if (!doc) {
      res.status(404).json({ error: 'Document not found or unauthorized.' });
      return;
    }

    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, doc.storage_path);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    // Delete record (CASCADE removes shares)
    execute('DELETE FROM medical_documents WHERE id = ?', [docId]);

    res.json({ success: true, message: 'Document deleted from Medical Drive.' });
  } catch (err: any) {
    console.error('delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

export default router;
