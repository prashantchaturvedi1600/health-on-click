import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  Upload,
  FileText,
  Trash2,
  Share2,
  Eye,
  Download,
  Shield,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  Lock,
  Filter
} from 'lucide-react';
import { MedicalDocument, DoctorItem } from '../../types';
import { api } from '../../services/api';

export const MedicalDriveView: React.FC = () => {
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [approvedDoctors, setApprovedDoctors] = useState<DoctorItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload modal states
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState<string>('');
  const [category, setCategory] = useState<string>('lab_report');
  const [notes, setNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Share modal state
  const [shareDoc, setShareDoc] = useState<MedicalDocument | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isSharing, setIsSharing] = useState<boolean>(false);

  // Filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await api.getMedicalDocuments();
      setDocuments(res.documents || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Medical Drive documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.searchDoctors({});
      setApprovedDoctors(res.doctors || []);
      if (res.doctors?.length > 0) {
        setSelectedDoctorId(res.doctors[0].id);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchDocuments();
    fetchDoctors();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category);
      formData.append('customName', customName);
      formData.append('notes', notes);

      await api.uploadMedicalDocument(formData);
      setIsUploadOpen(false);
      setSelectedFile(null);
      setCustomName('');
      setNotes('');
      await fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}" from your Medical Drive?`)) return;
    try {
      await api.deleteMedicalDocument(docId);
      await fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareDoc || !selectedDoctorId) return;

    try {
      setIsSharing(true);
      await api.shareMedicalDocument(shareDoc.id, selectedDoctorId);
      setShareDoc(null);
      await fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to share document');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevoke = async (docId: string, doctorId: string) => {
    try {
      await api.revokeMedicalDocument(docId, doctorId);
      await fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke access');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocs = documents.filter(doc => {
    if (selectedCategoryFilter === 'all') return true;
    return doc.category === selectedCategoryFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Medical Drive
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Encrypted personal medical storage. Securely upload, organize, and share documents with your verified doctors.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'all', label: 'All Records' },
          { key: 'lab_report', label: 'Lab Reports' },
          { key: 'prescription', label: 'Prescriptions' },
          { key: 'scan', label: 'Scans & X-Rays' },
          { key: 'discharge_summary', label: 'Discharge Summaries' },
          { key: 'other', label: 'Other Documents' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedCategoryFilter(tab.key)}
            className={`py-1.5 px-3 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategoryFilter === tab.key
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Document List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Accessing encrypted Medical Drive records...
          </div>
        ) : errorMsg ? (
          <div className="p-3 bg-red-50 text-xs text-red-700 rounded-lg">{errorMsg}</div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderLock className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Medical Documents Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload diagnostic tests, prescriptions, and medical history files to safely share with your attending doctors.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocs.map(doc => (
              <div key={doc.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">
                        {doc.fileName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700 uppercase">{doc.fileType}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{doc.category.replace('_', ' ')}</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      {doc.notes && (
                        <p className="text-xs text-slate-600 mt-1 italic">
                          Notes: {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* View / Download */}
                    <a
                      href={api.getDocumentFileUrl(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="View / Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>

                    {/* Share Button */}
                    <button
                      onClick={() => setShareDoc(doc)}
                      className="py-1.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(doc.id, doc.fileName)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Active Shares Section */}
                {doc.shares && doc.shares.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Active Doctor Access
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {doc.shares.map(s => (
                        <div
                          key={s.shareId}
                          className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs flex items-center gap-2 text-slate-700"
                        >
                          <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                          <span>Dr. {s.doctorName} ({s.specialization})</span>
                          <button
                            onClick={() => handleRevoke(doc.id, s.doctorId)}
                            className="text-red-500 hover:text-red-700 font-bold ml-1 text-[11px]"
                            title="Revoke Access"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      {isUploadOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Upload to Medical Drive
              </h3>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Medical File *
                </label>
                <input
                  type="file"
                  required
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      if (!customName) setCustomName(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complete Blood Count (CBC) Report"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Record Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="lab_report">Lab Report</option>
                  <option value="prescription">Prescription</option>
                  <option value="scan">Scan / X-Ray / MRI</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Doctor recommendation, test date, clinic..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {isUploading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE WITH DOCTOR MODAL */}
      {shareDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Share Record with Doctor
              </h3>
              <button onClick={() => setShareDoc(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Grant a verified doctor secure access to inspect <strong>"{shareDoc.fileName}"</strong>. 
              You can revoke access at any time.
            </p>

            {approvedDoctors.length === 0 ? (
              <div className="p-4 bg-amber-50 text-xs text-amber-800 rounded-xl">
                No approved doctors currently available in the platform registry.
              </div>
            ) : (
              <form onSubmit={handleShareSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Doctor
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={e => setSelectedDoctorId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    {approvedDoctors.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.fullName} ({doc.specialization} — {doc.hospitalName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShareDoc(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSharing || !selectedDoctorId}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg"
                  >
                    {isSharing ? 'Sharing...' : 'Grant Access'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
