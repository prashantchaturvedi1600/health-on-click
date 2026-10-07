import React, { useState, useEffect } from 'react';
import { FolderLock, FileText, Download, User, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { SharedDocumentForDoctor } from '../../types';
import { api } from '../../services/api';

export const DoctorSharedRecordsView: React.FC = () => {
  const [sharedDocs, setSharedDocs] = useState<SharedDocumentForDoctor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedDocs();
  }, []);

  const fetchSharedDocs = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await api.getDoctorSharedDocuments();
      setSharedDocs(res.sharedDocuments || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load shared medical records.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-1">
        <div className="flex items-center gap-2">
          <FolderLock className="w-5 h-5 text-teal-600" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Shared Patient Medical Records
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Diagnostic reports, lab summaries, and prescriptions explicitly shared with you by patients for consultation review.
        </p>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading authorized patient records...</div>
        ) : errorMsg ? (
          <div className="p-3 bg-red-50 text-xs text-red-700 rounded-lg">{errorMsg}</div>
        ) : sharedDocs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderLock className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Patient Records Shared Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When patients book consultations and share their medical files from their Medical Drive, they will appear here with encrypted authorization.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sharedDocs.map(doc => (
              <div key={doc.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">
                      {doc.file_name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-semibold text-teal-800">Patient: {doc.patient_name}</span>
                      {doc.gender && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{doc.gender}</span>
                        </>
                      )}
                      {doc.blood_group && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Blood: {doc.blood_group}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="uppercase font-semibold">{doc.file_type}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span aria-hidden="true">·</span>
                      <span>Shared: {new Date(doc.shared_at).toLocaleDateString()}</span>
                    </div>
                    {doc.notes && (
                      <p className="text-xs text-slate-600 mt-1 italic">
                        Patient Note: "{doc.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <a
                  href={api.getDocumentFileUrl(doc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors self-end sm:self-center shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Inspect Document</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
