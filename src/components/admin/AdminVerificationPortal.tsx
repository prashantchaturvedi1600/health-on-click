import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Stethoscope,
  Building,
  Award,
  AlertCircle,
  Mail,
  FileBadge,
  DollarSign
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminVerificationPortalProps {
  initialToken?: string | null;
}

export const AdminVerificationPortal: React.FC<AdminVerificationPortalProps> = ({ initialToken }) => {
  const [tokenInput, setTokenInput] = useState<string>(initialToken || '');
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPendingList = async () => {
    try {
      const res = await api.getPendingDoctorRequests();
      setPendingList(res.requests || []);
    } catch (_) {}
  };

  const loadTokenRequest = async (token: string) => {
    if (!token.trim()) return;
    try {
      setIsLoading(true);
      setFeedback(null);
      const res = await api.getReviewByToken(token.trim());
      setActiveRequest(res.request);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Invalid or expired review token.' });
      setActiveRequest(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingList();
    if (initialToken) {
      loadTokenRequest(initialToken);
    }
  }, [initialToken]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!activeRequest) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await api.actionReviewToken({
        token: activeRequest.adminToken,
        action,
        rejectionReason: action === 'reject' ? rejectionReason : undefined,
      });

      setFeedback({ type: 'success', message: res.message });
      await fetchPendingList();
      // Reload current request to show updated status
      await loadTokenRequest(activeRequest.adminToken);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit decision.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-3">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Medical Board Administration Portal</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Doctor Credential Review Workflow
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
          Authorized verification console for administrator <strong>prashant37chaturvedi@gmail.com</strong>.
          Every doctor registration generates a cryptographic review token and email alert before granting platform visibility.
        </p>
      </div>

      {/* Token Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Review by Token (From Admin Notification Email)
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste admin verification token from email..."
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          />
          <button
            onClick={() => loadTokenRequest(tokenInput)}
            disabled={isLoading || !tokenInput.trim()}
            className="py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-xs transition-colors shrink-0"
          >
            {isLoading ? 'Loading...' : 'Inspect Dossier'}
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Active Application Dossier */}
      {activeRequest && (
        <div className="bg-white rounded-2xl border-2 border-teal-500/30 p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider block">
                Verification Application
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                Dr. {activeRequest.doctor.fullName}
              </h3>
              <p className="text-xs text-slate-500">
                Submitted {new Date(activeRequest.submittedAt).toLocaleString()}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  activeRequest.doctor.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeRequest.doctor.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {activeRequest.doctor.status}
              </span>
            </div>
          </div>

          {/* Dossier Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <FileBadge className="w-4 h-4 text-teal-600" />
                Medical Qualifications & License
              </h4>
              <div className="space-y-1.5 text-slate-700">
                <div><strong>Qualification:</strong> {activeRequest.doctor.qualification}</div>
                <div><strong>Specialization:</strong> {activeRequest.doctor.specialization}</div>
                <div>
                  <strong>Medical Registration / License #:</strong>{' '}
                  <span className="font-mono font-bold text-teal-700">
                    {activeRequest.doctor.registrationNumber}
                  </span>
                </div>
                <div><strong>Experience:</strong> {activeRequest.doctor.experienceYears} Years</div>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-teal-600" />
                Practice & Contact Info
              </h4>
              <div className="space-y-1.5 text-slate-700">
                <div><strong>Hospital / Clinic:</strong> {activeRequest.doctor.hospitalName}</div>
                <div><strong>Address:</strong> {activeRequest.doctor.address}</div>
                <div><strong>Email:</strong> {activeRequest.doctor.email || 'N/A'}</div>
                <div><strong>Mobile:</strong> {activeRequest.doctor.phone || 'N/A'}</div>
                <div><strong>Consultation Fee:</strong> ₹{activeRequest.doctor.consultationFee}</div>
              </div>
            </div>
          </div>

          {/* Rejection input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Reviewer Notes / Rejection Reason
            </label>
            <input
              type="text"
              placeholder="e.g. License verified in State Medical Council registry..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            />
          </div>

          {/* Decision Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleAction('reject')}
              disabled={actionLoading}
              className="py-2.5 px-5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Application</span>
            </button>

            <button
              onClick={() => handleAction('approve')}
              disabled={actionLoading}
              className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve & Activate Doctor</span>
            </button>
          </div>
        </div>
      )}

      {/* Registry of All Submitted Requests */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          All Submitted Verification Requests ({pendingList.length})
        </h3>

        {pendingList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No doctor verification requests found in database.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingList.map(req => (
              <div
                key={req.request_id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Dr. {req.full_name}</h4>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{req.specialization}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-700">Lic #{req.registration_number}</span>
                    <span aria-hidden="true">·</span>
                    <span>{req.hospital_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>

                  <button
                    onClick={() => {
                      setTokenInput(req.admin_token);
                      loadTokenRequest(req.admin_token);
                    }}
                    className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
                  >
                    Review Dossier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
