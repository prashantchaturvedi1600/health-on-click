import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  FolderLock,
  MessageSquare,
  Search,
  PhoneCall,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  ChevronRight,
  Video,
  FileText
} from 'lucide-react';
import { Appointment } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface PatientDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenEmergency: () => void;
  onStartChatWithDoctor?: (doctorId: string) => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  onNavigateTab,
  onOpenEmergency,
  onStartChatWithDoctor,
}) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelModalApp, setCancelModalApp] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

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

  const handleCancelConfirm = async () => {
    if (!cancelModalApp) return;
    try {
      setIsCancelling(true);
      await api.updateAppointmentStatus(cancelModalApp.id, 'CANCELLED', cancelReason);
      setCancelModalApp(null);
      setCancelReason('');
      await fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
    }
  };

  const upcomingAppointments = appointments.filter(
    a => a.status === 'ACCEPTED' || a.status === 'REQUESTED'
  );
  const pastAppointments = appointments.filter(
    a => a.status === 'COMPLETED' || a.status === 'REJECTED' || a.status === 'CANCELLED'
  );

  const nextAppointment = upcomingAppointments[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'REQUESTED':
        return <span className="text-amber-700 font-semibold text-xs flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pending Doctor Confirmation</span>;
      case 'REJECTED':
        return <span className="text-red-700 font-semibold text-xs flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Doctor Unavailable</span>;
      case 'CANCELLED':
        return <span className="text-slate-500 font-semibold text-xs flex items-center gap-1">Cancelled</span>;
      case 'COMPLETED':
        return <span className="text-teal-700 font-semibold text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-teal-300 uppercase tracking-wider">
            Patient Portal
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.fullName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Manage your medical appointments, review laboratory reports in your Medical Drive, and consult securely with your healthcare team.
          </p>
        </div>

        {/* Quick Action Grid */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('doctors')}
            className="py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Book New Visit</span>
          </button>
          <button
            onClick={() => onNavigateTab('medical-drive')}
            className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FolderLock className="w-4 h-4" />
            <span>Medical Drive</span>
          </button>
        </div>
      </div>

      {/* Next Appointment Hero Card (if exists) */}
      {nextAppointment && (
        <div className="bg-white rounded-2xl border-2 border-teal-500/40 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Next Upcoming Consultation
            </span>
            <div>{getStatusBadge(nextAppointment.status)}</div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xl shrink-0">
                {nextAppointment.doctor_name?.charAt(0) || 'D'}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Dr. {nextAppointment.doctor_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {nextAppointment.doctor_specialization} · {nextAppointment.doctor_hospital}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>{nextAppointment.appointment_date}</span>
                  <span aria-hidden="true">·</span>
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>{nextAppointment.time_slot}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onStartChatWithDoctor && (
                <button
                  onClick={() => onStartChatWithDoctor(nextAppointment.doctor_id)}
                  className="flex-1 sm:flex-none py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message Doctor</span>
                </button>
              )}
              <button
                onClick={() => setCancelModalApp(nextAppointment)}
                className="py-2 px-3 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Appointment Records</h3>
            <p className="text-xs text-slate-500">Real-time consultation status with your doctors</p>
          </div>
          <button
            onClick={() => onNavigateTab('doctors')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            <span>Book another doctor</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading your appointments...</div>
        ) : errorMsg ? (
          <div className="p-3 bg-red-50 text-xs text-red-700 rounded-lg">{errorMsg}</div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Appointments Booked Yet</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Find an approved specialist and select an available time slot to start your consultation.
            </p>
            <button
              onClick={() => onNavigateTab('doctors')}
              className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
            >
              Search Doctors
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map(app => (
              <div
                key={app.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {app.doctor_name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">Dr. {app.doctor_name}</h4>
                      <span className="text-xs text-slate-400">({app.consultation_mode.toUpperCase()})</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{app.appointment_date}</span>
                      <span aria-hidden="true">·</span>
                      <span>{app.time_slot}</span>
                      <span aria-hidden="true">·</span>
                      <span>{app.doctor_specialization}</span>
                    </div>
                    {app.symptoms_notes && (
                      <p className="text-[11px] text-slate-500 italic mt-1">
                        Notes: {app.symptoms_notes}
                      </p>
                    )}
                    {app.cancellation_reason && (
                      <p className="text-[11px] text-red-600 mt-1">
                        Cancellation note: {app.cancellation_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div>{getStatusBadge(app.status)}</div>

                  <div className="flex items-center gap-2">
                    {onStartChatWithDoctor && (
                      <button
                        onClick={() => onStartChatWithDoctor(app.doctor_id)}
                        title="Chat"
                        className="p-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}

                    {(app.status === 'REQUESTED' || app.status === 'ACCEPTED') && (
                      <button
                        onClick={() => setCancelModalApp(app)}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CANCEL APPOINTMENT CONFIRMATION MODAL */}
      {cancelModalApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">Cancel Appointment?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel your consultation with <strong>Dr. {cancelModalApp.doctor_name}</strong> on {cancelModalApp.appointment_date} at {cancelModalApp.time_slot}?
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for cancellation (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Reason..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalApp(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelConfirm}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
