export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  email?: string;
  phone?: string;
  profilePhoto?: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt?: string;
}

export interface PatientProfile {
  userId: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
}

export interface DoctorProfile {
  userId: string;
  qualification: string;
  specialization: string;
  registrationNumber: string;
  experienceYears: number;
  hospitalName: string;
  address: string;
  consultationFee: number;
  consultationModes: string[];
  status: 'pending' | 'approved' | 'rejected';
  bio?: string;
  rating?: number;
  reviewCount?: number;
}

export interface DoctorAvailability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  consultationModes: string[];
  isActive: boolean;
}

export interface DoctorItem {
  id: string;
  fullName: string;
  profilePhoto?: string;
  qualification: string;
  specialization: string;
  registrationNumber: string;
  experienceYears: number;
  hospitalName: string;
  address: string;
  consultationFee: number;
  consultationModes: string[];
  status: 'pending' | 'approved' | 'rejected';
  bio?: string;
  rating?: number;
  reviewCount?: number;
  availability?: DoctorAvailability[];
}

export type AppointmentStatus = 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  time_slot: string;
  consultation_mode: 'video' | 'in_person' | 'chat';
  symptoms_notes?: string;
  status: AppointmentStatus;
  cancellation_reason?: string;
  created_at: string;
  // Patient view extra fields
  doctor_name?: string;
  doctor_photo?: string;
  doctor_qualification?: string;
  doctor_specialization?: string;
  doctor_hospital?: string;
  doctor_fee?: number;
  doctor_phone?: string;
  doctor_email?: string;
  // Doctor view extra fields
  patient_name?: string;
  patient_photo?: string;
  patient_phone?: string;
  patient_email?: string;
  patient_gender?: string;
  patient_dob?: string;
  patient_blood_group?: string;
  patient_emergency_contact?: string;
}

export interface DocumentShare {
  shareId: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  hospitalName: string;
  sharedAt: string;
}

export interface MedicalDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  category: 'lab_report' | 'prescription' | 'scan' | 'discharge_summary' | 'other';
  notes?: string;
  uploadedAt: string;
  shares: DocumentShare[];
}

export interface SharedDocumentForDoctor {
  id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  category: string;
  notes?: string;
  uploaded_at: string;
  shared_at: string;
  patient_name: string;
  patient_id: string;
  gender?: string;
  date_of_birth?: string;
  blood_group?: string;
}

export interface Conversation {
  id: string;
  patient_id: string;
  doctor_id: string;
  last_message_text?: string;
  last_message_at?: string;
  created_at: string;
  other_user_name: string;
  other_user_photo?: string;
  other_user_role: string;
  other_user_sub?: string;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  is_read: number;
  created_at: string;
  sender_name?: string;
  sender_photo?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppConfig {
  appName: string;
  tagline: string;
  emergencyNumber: string;
  smsProviderConfigured: boolean;
  smtpConfigured: boolean;
  adminEmail: string;
}
