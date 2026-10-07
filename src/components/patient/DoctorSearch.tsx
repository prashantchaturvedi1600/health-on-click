import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Stethoscope,
  Video,
  User,
  CheckCircle,
  AlertCircle,
  Filter,
  DollarSign,
  ChevronRight,
  X
} from 'lucide-react';
import { DoctorItem } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface DoctorSearchProps {
  onAppointmentBooked?: () => void;
}

export const DoctorSearch: React.FC<DoctorSearchProps> = ({ onAppointmentBooked }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('All');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState<Array<{ slot: string; isAvailable: boolean; modes: string[] }>>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [consultationMode, setConsultationMode] = useState<string>('video');
  const [symptomsNotes, setSymptomsNotes] = useState<string>('');
  const [bookingStatus, setBookingStatus] = useState<{ loading: boolean; error: string | null; success: boolean }>({
    loading: false,
    error: null,
    success: false,
  });

  const specializations = [
    'All',
    'General Medicine',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Psychiatry',
    'Gynecology',
  ];

  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await api.searchDoctors({
        q: searchQuery,
        specialization: selectedSpecialization,
        mode: selectedMode,
      });
      setDoctors(res.doctors);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load approved doctors.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpecialization, selectedMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  // When doctor and date are chosen, fetch real available slots
  useEffect(() => {
    if (selectedDoctor && bookingDate) {
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      api.getAvailableSlots(selectedDoctor.id, bookingDate)
        .then(res => {
          setAvailableSlots(res.slots || []);
        })
        .catch(err => {
          console.error('Failed to load slots:', err);
          setAvailableSlots([]);
        })
        .finally(() => {
          setIsLoadingSlots(false);
        });
    }
  }, [selectedDoctor, bookingDate]);

  const handleOpenBooking = (doc: DoctorItem) => {
    if (!isAuthenticated) {
      openAuthModal('login', 'patient');
      return;
    }
    setSelectedDoctor(doc);
    setSelectedSlot(null);
    setSymptomsNotes('');
    setBookingStatus({ loading: false, error: null, success: false });
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot) return;

    try {
      setBookingStatus({ loading: true, error: null, success: false });
      await api.bookAppointment({
        doctorId: selectedDoctor.id,
        appointmentDate: bookingDate,
        timeSlot: selectedSlot,
        consultationMode,
        symptomsNotes,
      });

      setBookingStatus({ loading: false, error: null, success: true });
      if (onAppointmentBooked) {
        setTimeout(() => {
          setSelectedDoctor(null);
          onAppointmentBooked();
        }, 1500);
      }
    } catch (err: any) {
      setBookingStatus({ loading: false, error: err.message || 'Failed to book slot.', success: false });
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Find Verified Doctors</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search licensed healthcare providers verified by medical administration.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by doctor name, hospital, or specialty..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Specialty Dropdown */}
          <select
            value={selectedSpecialization}
            onChange={e => setSelectedSpecialization(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {specializations.map(spec => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>

          {/* Consultation Mode Filter */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedMode('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedMode === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Modes
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('video')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedMode === 'video' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Video Consultation
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('in_person')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedMode === 'in_person' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In-Person Clinic
            </button>
          </div>
        </div>
      </div>

      {/* Doctor Results List */}
      <div>
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Scanning verified doctor registry...
          </div>
        ) : errorMsg ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Approved Doctors Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No doctors matching this criteria are currently verified. Note that new doctors undergo verification before appearing here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {doctors.map(doc => (
              <div
                key={doc.id}
                className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Doctor Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg shrink-0">
                        {doc.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base text-slate-900 leading-tight">
                            Dr. {doc.fullName}
                          </h3>
                        </div>
                        <div className="text-xs font-semibold text-teal-700">
                          {doc.specialization}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{doc.qualification}</span>
                          <span aria-hidden="true">·</span>
                          <span>{doc.experienceYears} Years Exp.</span>
                        </div>
                      </div>
                    </div>

                    {/* Verified Status Tag (clean unboxed text per constitution) */}
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 shrink-0">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <span>Verified Doctor</span>
                    </div>
                  </div>

                  {/* Hospital & Location */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">{doc.hospitalName}</span>
                      <span className="text-slate-400">— {doc.address}</span>
                    </div>
                    {doc.bio && (
                      <p className="text-xs text-slate-500 line-clamp-2 italic">
                        "{doc.bio}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Details & Booking CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Consultation Fee
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      ₹{doc.consultationFee}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenBooking(doc)}
                    className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Appointment</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REAL APPOINTMENT BOOKING MODAL */}
      {selectedDoctor && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block">
                  Book Consultation
                </span>
                <h3 className="text-lg font-bold">Dr. {selectedDoctor.fullName}</h3>
                <p className="text-xs text-slate-300">
                  {selectedDoctor.specialization} · {selectedDoctor.hospitalName}
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmBooking} className="p-6 space-y-5">
              {bookingStatus.success ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Appointment Requested!</h4>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                    Your request has been saved in the database and dispatched to Dr. {selectedDoctor.fullName}. 
                    You will receive status updates in your dashboard and email.
                  </p>
                </div>
              ) : (
                <>
                  {bookingStatus.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{bookingStatus.error}</span>
                    </div>
                  )}

                  {/* 1. Select Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      1. Select Consultation Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingDate}
                      onChange={e => setBookingDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* 2. Select Time Slot (Fetched from real DB availability) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        2. Select Time Slot
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Database-verified availability
                      </span>
                    </div>

                    {isLoadingSlots ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Checking doctor schedule for {bookingDate}...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        The doctor is not scheduled for consultations on this day. Please select another date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                        {availableSlots.map(slotItem => (
                          <button
                            type="button"
                            key={slotItem.slot}
                            disabled={!slotItem.isAvailable}
                            onClick={() => setSelectedSlot(slotItem.slot)}
                            className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all ${
                              !slotItem.isAvailable
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                : selectedSlot === slotItem.slot
                                ? 'bg-teal-600 border-teal-600 text-white font-semibold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50/50'
                            }`}
                          >
                            <span>{slotItem.slot}</span>
                            {!slotItem.isAvailable && (
                              <span className="block text-[9px] uppercase font-bold text-slate-400">
                                Booked
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Consultation Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      3. Consultation Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setConsultationMode('video')}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                          consultationMode === 'video'
                            ? 'bg-teal-50 border-teal-500 text-teal-800 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Video Call
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultationMode('in_person')}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                          consultationMode === 'in_person'
                            ? 'bg-teal-50 border-teal-500 text-teal-800 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        In-Person Clinic
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultationMode('chat')}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                          consultationMode === 'chat'
                            ? 'bg-teal-50 border-teal-500 text-teal-800 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Chat Consult
                      </button>
                    </div>
                  </div>

                  {/* 4. Symptoms / Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      4. Symptoms or Reason for Visit (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Briefly describe what you'd like to consult the doctor about..."
                      value={symptomsNotes}
                      onChange={e => setSymptomsNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Summary & Submit */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Due at Visit</span>
                      <span className="text-base font-bold text-slate-900">
                        ₹{selectedDoctor.consultationFee}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDoctor(null)}
                        className="py-2 px-3 text-xs text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedSlot || bookingStatus.loading}
                        className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        {bookingStatus.loading ? 'Booking...' : 'Confirm Appointment'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
