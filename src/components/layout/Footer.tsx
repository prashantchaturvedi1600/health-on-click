import React from 'react';
import { HeartPulse, Shield, PhoneCall } from 'lucide-react';

export const Footer: React.FC<{ onOpenEmergency: () => void }> = ({ onOpenEmergency }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">
                Health On Click
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Healthcare, Connected in One Click. A real, verified telemedicine and clinic appointment platform connecting patients with licensed healthcare specialists.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-teal-400" />
              <span>Full Medical Document Encryption & Role-Based Access Control</span>
            </div>
          </div>

          {/* Quick Access */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="text-sm space-y-2 text-slate-400">
              <li>Doctor Verification System</li>
              <li>Schedule Management</li>
              <li>Encrypted Medical Drive</li>
              <li>Doctor-Patient Messenger</li>
            </ul>
          </div>

          {/* Emergency Advisory Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Emergency Guidance
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you or someone around you is facing a critical emergency, immediately dial your local emergency services (112 / 911).
            </p>
            <button
              onClick={onOpenEmergency}
              className="w-full py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Emergency Dial Assistance
            </button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Health On Click. All medical data is strictly confidential.</p>
          <p>Admin verification notifications routed to prashant37chaturvedi@gmail.com</p>
        </div>
      </div>
    </footer>
  );
};
