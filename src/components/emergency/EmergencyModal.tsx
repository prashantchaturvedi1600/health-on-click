import React, { useState, useEffect } from 'react';
import { PhoneCall, AlertTriangle, X, ShieldAlert, HeartPulse, MapPin } from 'lucide-react';
import { api } from '../../services/api';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const [emergencyNumber, setEmergencyNumber] = useState<string>('112');

  useEffect(() => {
    if (isOpen) {
      api.getConfig()
        .then(cfg => {
          if (cfg.emergencyNumber) setEmergencyNumber(cfg.emergencyNumber);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Emergency Red Banner */}
        <div className="bg-red-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 id="emergency-modal-title" className="text-lg font-bold tracking-tight">
                Emergency Medical Services
              </h2>
              <p className="text-xs text-red-100">Immediate Life-Threatening Assistance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close emergency modal"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-900 leading-relaxed">
                <strong>Important Notice:</strong> Health On Click is an appointment and communication platform. 
                For acute emergencies (cardiac arrest, stroke symptoms, severe breathing distress, uncontrolled bleeding), 
                <strong> immediately contact your national emergency ambulance services.</strong>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Emergency Hotline
            </div>
            <a
              href={`tel:${emergencyNumber}`}
              className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-lg rounded-xl shadow-lg shadow-red-600/30 transition-transform active:scale-[0.98]"
            >
              <PhoneCall className="w-6 h-6 animate-pulse" />
              <span>Call Emergency Hotline ({emergencyNumber})</span>
            </a>
            <p className="text-xs text-center text-slate-500">
              Tapping above will initiate a direct phone call using your device.
            </p>
          </div>

          {/* Quick First-Aid Guidance */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-red-500" />
              While Waiting for Emergency Responders
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5">
              <li>Stay calm and stay on the line with the emergency operator.</li>
              <li>Provide your exact address, landmark, and building entry instructions.</li>
              <li>Keep patient seated or lying down comfortably; do not give oral fluids if unconscious.</li>
              <li>Ensure clear pathway for arriving paramedics.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            National Dispatch Helpline
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
