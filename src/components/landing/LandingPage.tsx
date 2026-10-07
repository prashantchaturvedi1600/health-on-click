import React from 'react';
import {
  Search,
  CalendarCheck,
  ShieldCheck,
  FolderLock,
  MessageSquare,
  PhoneCall,
  ArrowRight,
  Stethoscope,
  HeartPulse,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LandingPageProps {
  onFindDoctor: () => void;
  onOpenEmergency: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onFindDoctor, onOpenEmergency }) => {
  const { isAuthenticated, openAuthModal } = useAuth();

  return (
    <div className="space-y-16 py-8 sm:py-16">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto text-center px-4 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold tracking-wide">
          <HeartPulse className="w-4 h-4 text-teal-600" />
          <span>Real Telemedicine & Clinical Appointments</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
          Health On Click
        </h1>

        <p className="text-xl sm:text-2xl font-medium text-teal-800 max-w-2xl mx-auto">
          Healthcare, Connected in One Click.
        </p>

        <p className="text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          Connect directly with state-licensed, administrator-verified doctors. Book real-time consultations, upload private medical records, and chat securely with your healthcare team.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onFindDoctor}
            className="py-3.5 px-6 sm:px-8 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-base rounded-xl shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Search className="w-5 h-5" />
            <span>Find a Doctor</span>
          </button>

          {!isAuthenticated ? (
            <button
              onClick={() => openAuthModal('login')}
              className="py-3.5 px-6 sm:px-8 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-base rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-5 h-5" />
              <span>Login / Register</span>
            </button>
          ) : null}

          <button
            onClick={onOpenEmergency}
            className="py-3.5 px-5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-base rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            <PhoneCall className="w-5 h-5 text-red-600" />
            <span>Emergency Assistance</span>
          </button>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Comprehensive Medical Care
          </h2>
          <p className="text-sm text-slate-600">
            Every feature is backed by real database records, secure storage, and strict verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Find Verified Doctors</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every practicing doctor undergoes rigorous credential verification by administration before being listed for patient bookings.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Book Real Appointments</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Select verified time slots from doctors' active schedules with strict double-booking prevention and instant status notifications.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Communicate Securely</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Real-time messaging between booked patients and attending doctors, maintaining complete medical confidentiality.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FolderLock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Store Medical Records</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload lab reports, discharge summaries, and prescriptions to your encrypted server-backed Medical Drive.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Share Records with Doctors</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Grant specific doctors access to view your test reports during your consultation, with one-click revocation at any time.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-red-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Access Emergency Calling</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Instant one-tap direct dialing to your regional emergency dispatch for critical life-threatening conditions.
            </p>
          </div>
        </div>
      </section>

      {/* For Doctors Callout */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-lg">
            <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
              For Healthcare Professionals
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Are you a licensed medical doctor?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Submit your medical registration number, clinic schedule, and consultation fees. Once verified by our administration, start consulting patients online and at your clinic.
            </p>
          </div>
          <button
            onClick={() => openAuthModal('register', 'doctor')}
            className="py-3 px-6 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl transition-colors shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span>Register as Doctor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
