import React from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldCheck, Mail } from 'lucide-react';
import { DoctorProfile } from '../../types';

interface DoctorVerificationBannerProps {
  doctorProfile?: DoctorProfile | null;
  onRefresh?: () => void;
}

export const DoctorVerificationBanner: React.FC<DoctorVerificationBannerProps> = ({
  doctorProfile,
  onRefresh,
}) => {
  if (!doctorProfile) return null;

  if (doctorProfile.status === 'approved') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">
              Verified & Approved Medical Practitioner
            </h4>
            <p className="text-xs text-emerald-700">
              License #{doctorProfile.registrationNumber} verified. Your profile and consultation slots are active in the patient discovery directory.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (doctorProfile.status === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900">
              Doctor Verification Pending Admin Review
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Your credentials (License #{doctorProfile.registrationNumber}, {doctorProfile.qualification}) are currently under review by our medical administrator.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-700 pt-1">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Verification notice dispatched to: <strong>prashant37chaturvedi@gmail.com</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2.5 rounded-xl flex items-center justify-between">
          <span>
            While your status is pending, your profile is hidden from patient search and cannot accept appointments.
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="font-bold underline text-amber-900 hover:text-amber-950 shrink-0 ml-2"
            >
              Check Status
            </button>
          )}
        </div>
      </div>
    );
  }

  if (doctorProfile.status === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2 text-xs text-red-800">
        <div className="flex items-center gap-2 font-bold text-sm text-red-900">
          <AlertCircle className="w-4 h-4 text-red-600" />
          Verification Application Not Approved
        </div>
        <p>
          The administrator was unable to verify your medical credentials. Please verify your license number and contact support or re-submit updated documents.
        </p>
      </div>
    );
  }

  return null;
};
