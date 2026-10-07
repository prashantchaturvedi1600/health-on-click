import React, { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  ShieldCheck,
  User,
  Stethoscope,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Building,
  Award,
  FileBadge,
  Clock,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, authModalMode, authDefaultRole } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [role, setRole] = useState<'patient' | 'doctor'>(authDefaultRole);
  const [authMethod, setAuthMethod] = useState<'otp' | 'google'>('otp');

  // Form states
  const [identifier, setIdentifier] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');

  // Doctor registration fields
  const [qualification, setQualification] = useState<string>('MBBS, MD');
  const [specialization, setSpecialization] = useState<string>('General Medicine');
  const [registrationNumber, setRegistrationNumber] = useState<string>('');
  const [experienceYears, setExperienceYears] = useState<number>(5);
  const [hospitalName, setHospitalName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [consultationFee, setConsultationFee] = useState<number>(600);
  const [consultationModes, setConsultationModes] = useState<string[]>(['video', 'in_person']);
  const [bio, setBio] = useState<string>('');

  // Patient registration fields
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [gender, setGender] = useState<string>('Female');
  const [bloodGroup, setBloodGroup] = useState<string>('O+');
  const [emergencyContact, setEmergencyContact] = useState<string>('');

  // Google sign in states
  const [googleEmail, setGoogleEmail] = useState<string>('');
  const [googleName, setGoogleName] = useState<string>('');

  // Status & feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setDevHint(null);

    if (!identifier || identifier.trim().length < 5) {
      setErrorMsg('Please enter a valid mobile number or email address.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.sendOtp(identifier.trim(), role);
      setOtpSent(true);
      setSuccessMsg(res.message);
      if (res.devHintOtp) {
        setDevHint(`Real OTP generated on server: ${res.devHintOtp} (Auto-filled for rapid verification)`);
        setOtpCode(res.devHintOtp);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    if (mode === 'register' && !fullName.trim()) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }

    if (mode === 'register' && role === 'doctor' && (!registrationNumber.trim() || !hospitalName.trim())) {
      setErrorMsg('Medical license number and hospital/clinic name are required for doctor verification.');
      return;
    }

    try {
      setIsLoading(true);
      const registrationData =
        role === 'doctor'
          ? {
              qualification,
              specialization,
              registrationNumber: registrationNumber.trim(),
              experienceYears: Number(experienceYears) || 1,
              hospitalName: hospitalName.trim(),
              address: address.trim(),
              consultationFee: Number(consultationFee) || 500,
              consultationModes,
              bio: bio.trim(),
              email: identifier.includes('@') ? identifier.trim() : emailInput.trim(),
              phone: !identifier.includes('@') ? identifier.trim() : undefined,
            }
          : {
              dateOfBirth,
              gender,
              bloodGroup,
              emergencyContact: emergencyContact.trim(),
              email: identifier.includes('@') ? identifier.trim() : emailInput.trim(),
              phone: !identifier.includes('@') ? identifier.trim() : undefined,
            };

      const res = await api.verifyOtp(
        identifier.trim(),
        otpCode.trim(),
        role,
        fullName.trim() || undefined,
        registrationData
      );

      await login(res.token, res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!googleEmail || !googleEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google account email.');
      return;
    }

    try {
      setIsLoading(true);
      const registrationData =
        role === 'doctor'
          ? {
              qualification,
              specialization,
              registrationNumber: registrationNumber.trim() || `MCI-${Date.now().toString().slice(-6)}`,
              experienceYears: Number(experienceYears) || 3,
              hospitalName: hospitalName.trim() || 'City General Hospital',
              address: address.trim() || 'Medical District',
              consultationFee: Number(consultationFee) || 600,
              consultationModes,
              bio: bio.trim(),
              phone: identifier || undefined,
            }
          : {
              dateOfBirth,
              gender,
              bloodGroup,
              emergencyContact: emergencyContact.trim(),
              phone: identifier || undefined,
            };

      const res = await api.googleAuth(
        googleEmail.trim().toLowerCase(),
        googleName.trim() || googleEmail.split('@')[0],
        undefined,
        role,
        registrationData
      );

      await login(res.token, res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setOtpSent(false);
    setOtpCode('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setDevHint(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              Secure Healthcare Access
            </div>
            <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight">
              {mode === 'login' ? 'Sign In to Health On Click' : 'Create Your Account'}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {role === 'doctor'
                ? mode === 'login'
                  ? 'Access your practice, appointments, and shared patient records'
                  : 'Register for credential verification and clinical onboarding'
                : 'Book consultations, store medical documents, and chat with verified doctors'}
            </p>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls */}
        <div className="p-6 space-y-6">
          {/* Role Switcher */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setRole('patient');
                  setOtpSent(false);
                }}
                className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  role === 'patient'
                    ? 'bg-white text-teal-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                I am a Patient
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('doctor');
                  setOtpSent(false);
                }}
                className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  role === 'doctor'
                    ? 'bg-white text-teal-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                I am a Doctor
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => toggleMode('login')}
              className={`pb-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                mode === 'login'
                  ? 'border-teal-600 text-teal-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => toggleMode('register')}
              className={`pb-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                mode === 'register'
                  ? 'border-teal-600 text-teal-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Register New {role === 'doctor' ? 'Doctor' : 'Patient'}
            </button>
          </div>

          {/* Auth Method Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('otp');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'otp'
                  ? 'bg-teal-50 border-teal-300 text-teal-800 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Mobile Number OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('google');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'google'
                  ? 'bg-teal-50 border-teal-300 text-teal-800 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Google / Gmail
            </button>
          </div>

          {/* Status alerts */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {devHint && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed font-mono">
              {devHint}
            </div>
          )}

          {/* OTP FORM */}
          {authMethod === 'otp' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Mobile Number or Email
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="+919876543210 or doctor@example.com"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      A real 6-digit cryptographic verification code will be generated.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>{isLoading ? 'Sending Code...' : 'Send Verification Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {/* Enter OTP */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-xs text-teal-600 hover:underline"
                      >
                        Change Number
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full tracking-widest text-center font-mono text-lg font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* If Registering, collect details */}
                  {mode === 'register' && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Full Legal Name
                        </label>
                        <input
                          type="text"
                          placeholder={role === 'doctor' ? 'Dr. Sarah Mitchell' : 'Jane Doe'}
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      {/* Doctor Specific Form Fields */}
                      {role === 'doctor' && (
                        <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <FileBadge className="w-3.5 h-3.5 text-teal-600" />
                            Doctor Verification Credentials
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-slate-600">Qualification</label>
                              <input
                                type="text"
                                placeholder="MBBS, MD"
                                value={qualification}
                                onChange={e => setQualification(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-600">Specialization</label>
                              <select
                                value={specialization}
                                onChange={e => setSpecialization(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                              >
                                <option>General Medicine</option>
                                <option>Cardiology</option>
                                <option>Dermatology</option>
                                <option>Pediatrics</option>
                                <option>Orthopedics</option>
                                <option>Neurology</option>
                                <option>Psychiatry</option>
                                <option>Gynecology</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-slate-600">License / Reg. Number *</label>
                              <input
                                type="text"
                                placeholder="MCI-2019-9481"
                                value={registrationNumber}
                                onChange={e => setRegistrationNumber(e.target.value)}
                                required
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-600">Experience (Years)</label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={experienceYears}
                                onChange={e => setExperienceYears(Number(e.target.value))}
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-600">Hospital / Clinic Name *</label>
                            <input
                              type="text"
                              placeholder="City Life Multispecialty Hospital"
                              value={hospitalName}
                              onChange={e => setHospitalName(e.target.value)}
                              required
                              className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-slate-600">Consultation Fee (₹)</label>
                              <input
                                type="number"
                                min={100}
                                step={50}
                                value={consultationFee}
                                onChange={e => setConsultationFee(Number(e.target.value))}
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-600">Consultation Modes</label>
                              <div className="flex gap-3 pt-2">
                                <label className="flex items-center gap-1 text-[11px]">
                                  <input
                                    type="checkbox"
                                    checked={consultationModes.includes('video')}
                                    onChange={e => {
                                      setConsultationModes(prev =>
                                        e.target.checked ? [...prev, 'video'] : prev.filter(m => m !== 'video')
                                      );
                                    }}
                                  />
                                  Video
                                </label>
                                <label className="flex items-center gap-1 text-[11px]">
                                  <input
                                    type="checkbox"
                                    checked={consultationModes.includes('in_person')}
                                    onChange={e => {
                                      setConsultationModes(prev =>
                                        e.target.checked ? [...prev, 'in_person'] : prev.filter(m => m !== 'in_person')
                                      );
                                    }}
                                  />
                                  In-Person
                                </label>
                              </div>
                            </div>
                          </div>

                          <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                            <strong>Note:</strong> Submitted doctor profiles require administrator review
                            before approval. Notification will be dispatched to prashant37chaturvedi@gmail.com.
                          </p>
                        </div>
                      )}

                      {/* Patient Specific Form Fields */}
                      {role === 'patient' && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[11px] text-slate-600">Blood Group</label>
                            <select
                              value={bloodGroup}
                              onChange={e => setBloodGroup(e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs"
                            >
                              <option>O+</option>
                              <option>O-</option>
                              <option>A+</option>
                              <option>A-</option>
                              <option>B+</option>
                              <option>B-</option>
                              <option>AB+</option>
                              <option>AB-</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-600">Emergency Contact</label>
                            <input
                              type="text"
                              placeholder="+91..."
                              value={emergencyContact}
                              onChange={e => setEmergencyContact(e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>{isLoading ? 'Verifying...' : mode === 'login' ? 'Verify & Sign In' : 'Submit Registration'}</span>
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* GOOGLE AUTH FORM */}
          {authMethod === 'google' && (
            <form onSubmit={handleGoogleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Google / Gmail Address
                </label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={googleEmail}
                  onChange={e => setGoogleEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name (as displayed on Google profile)
                </label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={googleName}
                  onChange={e => setGoogleName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white"
                />
              </div>

              {role === 'doctor' && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div className="font-semibold text-slate-800">Doctor Credentials Verification</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-600">Specialization</label>
                      <input
                        type="text"
                        value={specialization}
                        onChange={e => setSpecialization(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600">License Number</label>
                      <input
                        type="text"
                        placeholder="MCI-12345"
                        value={registrationNumber}
                        onChange={e => setRegistrationNumber(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>{isLoading ? 'Authenticating with Google...' : 'Continue with Google Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
