import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'health_on_click.sqlite');

let dbInstance: SqlJsDatabase | null = null;

// Ensure directories exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const STORAGE_DIR = path.resolve(process.cwd(), 'uploads/medical_drive');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign key constraints
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Initialize schema
  initializeSchema(dbInstance);
  saveDb();

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const binaryArray = dbInstance.export();
    const buffer = Buffer.from(binaryArray);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

function initializeSchema(db: SqlJsDatabase): void {
  db.run(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'admin')),
      phone TEXT,
      email TEXT UNIQUE,
      full_name TEXT NOT NULL,
      profile_photo TEXT,
      auth_provider TEXT DEFAULT 'local',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'pending', 'suspended')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    -- Patients profile table
    CREATE TABLE IF NOT EXISTS patients (
      user_id TEXT PRIMARY KEY,
      date_of_birth TEXT,
      gender TEXT,
      blood_group TEXT,
      address TEXT,
      emergency_contact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Doctors profile table
    CREATE TABLE IF NOT EXISTS doctors (
      user_id TEXT PRIMARY KEY,
      qualification TEXT NOT NULL,
      specialization TEXT NOT NULL,
      registration_number TEXT NOT NULL,
      experience_years INTEGER NOT NULL DEFAULT 1,
      hospital_name TEXT NOT NULL,
      address TEXT NOT NULL,
      consultation_fee REAL NOT NULL DEFAULT 500,
      consultation_modes TEXT NOT NULL DEFAULT '["video","in_person"]',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      rejection_reason TEXT,
      bio TEXT,
      rating REAL DEFAULT 5.0,
      review_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
    CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);

    -- Doctor verification requests for admin review
    CREATE TABLE IF NOT EXISTS doctor_verification_requests (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      admin_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      admin_notes TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      reviewed_by TEXT,
      FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_dvr_admin_token ON doctor_verification_requests(admin_token);

    -- Doctor availability settings
    CREATE TABLE IF NOT EXISTS doctor_availability (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL, -- "09:00"
      end_time TEXT NOT NULL,   -- "17:00"
      slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
      consultation_modes TEXT NOT NULL DEFAULT '["video","in_person"]',
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_avail_doctor ON doctor_availability(doctor_id);

    -- Appointments table
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      appointment_date TEXT NOT NULL, -- YYYY-MM-DD
      time_slot TEXT NOT NULL,         -- "09:30 - 10:00"
      consultation_mode TEXT NOT NULL CHECK(consultation_mode IN ('video', 'in_person', 'chat')),
      symptoms_notes TEXT,
      status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED')),
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_app_doctor_date ON appointments(doctor_id, appointment_date, time_slot);
    CREATE INDEX IF NOT EXISTS idx_app_patient ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_app_status ON appointments(status);

    -- Conversations table (doctor <-> patient chat)
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_text TEXT,
      last_message_at DATETIME,
      FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(patient_id, doctor_id)
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      message_text TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at);

    -- Medical Drive Documents
    CREATE TABLE IF NOT EXISTS medical_documents (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('lab_report', 'prescription', 'scan', 'discharge_summary', 'other')),
      notes TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_docs_patient ON medical_documents(patient_id);

    -- Document Shares with Doctors
    CREATE TABLE IF NOT EXISTS document_shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      shared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME,
      FOREIGN KEY(document_id) REFERENCES medical_documents(id) ON DELETE CASCADE,
      FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(document_id, doctor_id)
    );

    CREATE INDEX IF NOT EXISTS idx_shares_doc_doc ON document_shares(doctor_id, is_active);

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

    -- OTP Verifications table
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL, -- phone or email
      otp_code_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      verified INTEGER DEFAULT 0,
      attempts_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_verifications(identifier);
  `);
}

/**
 * Helper to run query with params and return array of objects
 */
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

/**
 * Helper to run query with params and return single object or null
 */
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const results = queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Helper to execute INSERT, UPDATE, DELETE with params and auto-save
 */
export function execute(sql: string, params: any[] = []): void {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  saveDb();
}
