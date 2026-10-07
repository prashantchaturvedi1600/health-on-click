import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  MessageSquare,
  FolderLock,
  Phone,
  Mail,
  Check,
  X,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { Appointment } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DoctorVerificationBanner } from './DoctorVerificationBanner';

interface DoctorDashboardProps {
  onNavigateTab: (tab: string) => void;
  onStartChatWithPatient?: (patientId: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  onNavigateTab,
  onStartChatWithPatient,
}) => {
  const { user, profile, refreshUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reject modal state
  const [rejectApp, setRejectApp] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await api.getAppointments();
      setAppointments(res.appointments || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleUpdateStatus = async (appId: string, status: 'ACCEPTED' | 'REJECTED' | 'COMPLETED', reason?: string) => {
    try {
      setIsUpdating(true);
      await api.updateAppointmentStatus(appId, status, reason);
      setRejectApp(null);
      setRejectionReason('');
      await fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const pendingRequests = appointments.filter(a => a.status === 'REQUESTED');
  const todayAppointments = appointments.filter(
    a => a.appointment_date === todayStr && a.status === 'ACCEPTED'
  );
  const upcomingAppointments = appointments.filter(
    a => a.appointment_date > todayStr && a.status === 'ACCEPTED'
  );
  const completedOrOther = appointments.filter(
    a => a.status === 'COMPLETED' || a.status === 'REJECTED' || a.status === 'CANCELLED'
  );

  return (
    <div className="space-y-8">
      {/* Verification Status Banner */}
      <DoctorVerificationBanner doctorProfile={profile} onRefresh={refreshUser} />

      {/* Header Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            Clinical Practice
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Dr. {user?.fullName} · {profile?.specialization || 'Specialist'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {profile?.hospitalName} · License #{profile?.registrationNumber} · Fee: ₹{profile?.consultationFee}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('doctor-availability')}
            className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Manage Availability</span>
          </button>
          <button
            onClick={() => onNavigateTab('doctor-shared-records')}
            className="py-2 px-3.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span>Shared Patient Records</span>
          </button>
        </div>
      </div>

      {/* Pending Appointment Requests (Doctor Must Accept or Reject) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              Pending Appointment Requests ({pendingRequests.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Awaiting your confirmation
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No incoming pending appointment requests at this moment.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingRequests.map(req => (
              <div key={req.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{req.patient_name}</h4>
                    <span className="text-xs text-slate-400 capitalize">· Mode: {req.consultation_mode}</span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="font-medium text-teal-700">{req.appointment_date}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-teal-700">{req.time_slot}</span>
                    {req.patient_gender && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{req.patient_gender}</span>
                      </>
                    )}
                    {req.patient_blood_group && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Blood: {req.patient_blood_group}</span>
                      </>
                    )}
                  </div>
                  {req.symptoms_notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg">
                      Patient Note: "{req.symptoms_notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}
                    className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Request</span>
                  </button>
                  <button
                    disabled={isUpdating}
                    onClick={() => setRejectApp(req)}
                    className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Appointments */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">
              Today's Schedule ({todayAppointments.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">{todayStr}</span>
        </div>

        {todayAppointments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No confirmed appointments scheduled for today.
          </div>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map(app => (
              <div
                key={app.id}
                className="p-4 bg-teal-50/40 rounded-xl border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{app.patient_name}</h4>
                    <span className="text-xs text-teal-800 font-semibold uppercase">{app.consultation_mode}</span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                    <span className="font-semibold">{app.time_slot}</span>
                    <span aria-hidden="true">·</span>
                    <span>Phone: {app.patient_phone || 'Private'}</span>
                  </div>
                  {app.symptoms_notes && (
                    <p className="text-xs text-slate-500 mt-1">Notes: {app.symptoms_notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onStartChatWithPatient && (
                    <button
                      onClick={() => onStartChatWithPatient(app.patient_id)}
                      className="py-1.5 px-3 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-slate-50"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                      <span>Chat</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleUpdateStatus(app.id, 'COMPLETED')}
                    className="py-1.5 px-3.5 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Mark as Completed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Confirmed Appointments */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Upcoming Scheduled Appointments ({upcomingAppointments.length})
        </h3>

        {upcomingAppointments.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No upcoming appointments scheduled yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingAppointments.map(app => (
              <div key={app.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">{app.patient_name}</h4>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{app.appointment_date}</span>
                    <span aria-hidden="true">·</span>
                    <span>{app.time_slot}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{app.consultation_mode}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onStartChatWithPatient && (
                    <button
                      onClick={() => onStartChatWithPatient(app.patient_id)}
                      className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg"
                      title="Chat with Patient"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decline Modal */}
      {rejectApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">
              Decline Appointment Request
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Decline booking from <strong>{rejectApp.patient_name}</strong> for {rejectApp.appointment_date} at {rejectApp.time_slot}?
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for patient (e.g. In surgery, out of town)
              </label>
              <textarea
                rows={2}
                placeholder="Doctor unavailable at this hour..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectApp(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleUpdateStatus(rejectApp.id, 'REJECTED', rejectionReason)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg"
              >
                {isUpdating ? 'Updating...' : 'Decline Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
