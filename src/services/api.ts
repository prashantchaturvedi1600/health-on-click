import {
  User,
  DoctorItem,
  Appointment,
  MedicalDocument,
  SharedDocumentForDoctor,
  Conversation,
  Message,
  NotificationItem,
  AppConfig,
  DoctorAvailability,
} from '../types';

const TOKEN_KEY = 'health_on_click_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default Content-Type to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch (_) {
      const errorText = await response.text();
      if (errorText) errorMsg = errorText;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // System Config
  getConfig: () => request<AppConfig>('/api/config'),

  // Auth
  sendOtp: (identifier: string, role: string) =>
    request<{ success: boolean; message: string; devHintOtp?: string }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, role }),
    }),

  verifyOtp: (identifier: string, otpCode: string, role: string, fullName?: string, registrationData?: any) =>
    request<{ token: string; user: User }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, otpCode, role, fullName, registrationData }),
    }),

  googleAuth: (email: string, fullName: string, photoUrl: string | undefined, role: string, registrationData?: any) =>
    request<{ token: string; user: User }>('/api/auth/google-auth', {
      method: 'POST',
      body: JSON.stringify({ email, fullName, photoUrl, role, registrationData }),
    }),

  getCurrentUser: () =>
    request<{ user: User; profile: any }>('/api/auth/me'),

  updateProfile: (data: any) =>
    request<{ success: boolean; message: string }>('/api/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Doctors
  searchDoctors: (params: { q?: string; specialization?: string; mode?: string; maxFee?: number }) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.specialization) query.append('specialization', params.specialization);
    if (params.mode) query.append('mode', params.mode);
    if (params.maxFee) query.append('maxFee', params.maxFee.toString());
    return request<{ doctors: DoctorItem[] }>(`/api/doctors/search?${query.toString()}`);
  },

  getDoctor: (id: string) =>
    request<{ doctor: DoctorItem }>(`/api/doctors/${id}`),

  submitDoctorVerification: (data: any) =>
    request<{ success: boolean; message: string; adminToken?: string }>('/api/doctors/submit-verification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDoctorAvailability: () =>
    request<{ availability: DoctorAvailability[] }>('/api/doctors/me/availability'),

  updateDoctorAvailability: (schedule: any[]) =>
    request<{ success: boolean; message: string }>('/api/doctors/me/availability', {
      method: 'PUT',
      body: JSON.stringify({ schedule }),
    }),

  // Appointments
  getAvailableSlots: (doctorId: string, date: string) =>
    request<{
      available: boolean;
      message?: string;
      slots: Array<{ slot: string; isAvailable: boolean; modes: string[] }>;
    }>(`/api/appointments/available-slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`),

  bookAppointment: (data: {
    doctorId: string;
    appointmentDate: string;
    timeSlot: string;
    consultationMode: string;
    symptomsNotes?: string;
  }) =>
    request<{ success: boolean; message: string; appointmentId: string }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAppointments: () =>
    request<{ appointments: Appointment[] }>('/api/appointments'),

  updateAppointmentStatus: (id: string, status: string, reason?: string) =>
    request<{ success: boolean; message: string }>(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),

  // Chat
  getConversations: () =>
    request<{ conversations: Conversation[] }>('/api/chat/conversations'),

  getMessages: (conversationId: string) =>
    request<{ messages: Message[] }>(`/api/chat/messages/${conversationId}`),

  sendMessage: (data: { conversationId?: string; recipientId?: string; messageText: string }) =>
    request<{ success: boolean; message: Message }>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Medical Drive
  uploadMedicalDocument: (formData: FormData) =>
    request<{ success: boolean; message: string; document: MedicalDocument }>('/api/medical-drive/upload', {
      method: 'POST',
      body: formData,
    }),

  getMedicalDocuments: () =>
    request<{ documents: MedicalDocument[] }>('/api/medical-drive/documents'),

  deleteMedicalDocument: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/medical-drive/documents/${id}`, {
      method: 'DELETE',
    }),

  shareMedicalDocument: (documentId: string, doctorId: string) =>
    request<{ success: boolean; message: string }>('/api/medical-drive/share', {
      method: 'POST',
      body: JSON.stringify({ documentId, doctorId }),
    }),

  revokeMedicalDocument: (documentId: string, doctorId: string) =>
    request<{ success: boolean; message: string }>('/api/medical-drive/revoke', {
      method: 'POST',
      body: JSON.stringify({ documentId, doctorId }),
    }),

  getDoctorSharedDocuments: () =>
    request<{ sharedDocuments: SharedDocumentForDoctor[] }>('/api/medical-drive/doctor-shared'),

  // Secure File Download/View Link
  getDocumentFileUrl: (id: string) => `/api/medical-drive/documents/${id}/download`,

  // Admin Review Flow
  getReviewByToken: (token: string) =>
    request<{ request: any }>(`/api/admin/review-token/${token}`),

  actionReviewToken: (data: { token: string; action: 'approve' | 'reject'; notes?: string; rejectionReason?: string }) =>
    request<{ success: boolean; message: string; status: string }>('/api/admin/action-token', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPendingDoctorRequests: () =>
    request<{ requests: any[] }>('/api/admin/pending-requests'),

  // Notifications
  getNotifications: () =>
    request<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    }),

  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    }),
};
