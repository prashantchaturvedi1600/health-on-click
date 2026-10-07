import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  PhoneCall,
  Bell,
  User,
  LogOut,
  Stethoscope,
  Calendar,
  FolderLock,
  MessageSquare,
  Search,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface NavbarProps {
  onOpenEmergency: () => void;
  onOpenNotifications: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenEmergency,
  onOpenNotifications,
  currentTab,
  onSelectTab,
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      api.getNotifications()
        .then(res => setUnreadNotifs(res.unreadCount))
        .catch(() => {});
      const interval = setInterval(() => {
        api.getNotifications()
          .then(res => setUnreadNotifs(res.unreadCount))
          .catch(() => {});
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition-colors">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight block">
                  Health On Click
                </span>
                <span className="text-[10px] text-teal-700 font-semibold tracking-wide uppercase block -mt-1">
                  Healthcare in One Click
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <button
                onClick={() => onSelectTab('doctors')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentTab === 'doctors'
                    ? 'text-teal-700 bg-teal-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Search className="w-4 h-4" />
                Find Doctors
              </button>

              {isAuthenticated && user?.role === 'patient' && (
                <>
                  <button
                    onClick={() => onSelectTab('appointments')}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentTab === 'appointments'
                        ? 'text-teal-700 bg-teal-50 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Appointments
                  </button>
                  <button
                    onClick={() => onSelectTab('medical-drive')}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentTab === 'medical-drive'
                        ? 'text-teal-700 bg-teal-50 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <FolderLock className="w-4 h-4" />
                    Medical Drive
                  </button>
                  <button
                    onClick={() => onSelectTab('chat')}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentTab === 'chat'
                        ? 'text-teal-700 bg-teal-50 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Messages
                  </button>
                </>
              )}

              {isAuthenticated && user?.role === 'doctor' && (
                <>
                  <button
                    onClick={() => onSelectTab('doctor-dashboard')}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentTab === 'doctor-dashboard'
                        ? 'text-teal-700 bg-teal-50 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    My Appointments
                  </button>
                  <button
                    onClick={() => onSelectTab('doctor-availability')}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentTab === 'doctor-availability'
                        ? 'text-teal-700 bg-teal-50 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    Availability
                  </button>
                  <button
                    onClick={() => onSelectTab('doctor-shared-records')}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentTab === 'doctor-shared-records'
                        ? 'text-teal-700 bg-teal-50 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <FolderLock className="w-4 h-4" />
                    Shared Records
                  </button>
                  <button
                    onClick={() => onSelectTab('chat')}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentTab === 'chat'
                        ? 'text-teal-700 bg-teal-50 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Messages
                  </button>
                </>
              )}

              {/* Admin Verification Portal Link */}
              <button
                onClick={() => onSelectTab('admin-portal')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 text-slate-500 hover:text-slate-800 ${
                  currentTab === 'admin-portal' ? 'bg-slate-100 text-slate-900' : ''
                }`}
                title="Admin Review for prashant37chaturvedi@gmail.com"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Admin Review
              </button>
            </nav>
          </div>

          {/* Right Action Icons & Emergency */}
          <div className="flex items-center gap-3">
            {/* PROMINENT EMERGENCY BUTTON */}
            <button
              onClick={onOpenEmergency}
              aria-label="Open emergency call assistance"
              className="py-2 px-3.5 sm:px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>EMERGENCY</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Notifications Bell */}
                <button
                  onClick={onOpenNotifications}
                  aria-label="Open notifications"
                  className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifs > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </button>

                {/* User Info & Logout */}
                <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">
                      {user?.fullName}
                    </div>
                    <div className="text-[10px] text-teal-600 font-medium capitalize">
                      {user?.role}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="py-2 px-3.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-2 shadow-lg">
          <button
            onClick={() => {
              onSelectTab('doctors');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-teal-600" />
            Find Doctors
          </button>

          {isAuthenticated && user?.role === 'patient' && (
            <>
              <button
                onClick={() => {
                  onSelectTab('appointments');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                My Appointments
              </button>
              <button
                onClick={() => {
                  onSelectTab('medical-drive');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <FolderLock className="w-4 h-4 text-teal-600" />
                Medical Drive
              </button>
              <button
                onClick={() => {
                  onSelectTab('chat');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-teal-600" />
                Messages
              </button>
            </>
          )}

          {isAuthenticated && user?.role === 'doctor' && (
            <>
              <button
                onClick={() => {
                  onSelectTab('doctor-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                Doctor Dashboard
              </button>
              <button
                onClick={() => {
                  onSelectTab('doctor-availability');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Availability Settings
              </button>
              <button
                onClick={() => {
                  onSelectTab('doctor-shared-records');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <FolderLock className="w-4 h-4 text-teal-600" />
                Shared Patient Records
              </button>
            </>
          )}

          <button
            onClick={() => {
              onSelectTab('admin-portal');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Admin Review Portal
          </button>

          <div className="pt-3 border-t border-slate-100">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">{user?.fullName} ({user?.role})</span>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-red-600 font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    openAuthModal('login');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2 text-center text-xs font-semibold border rounded-lg"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    openAuthModal('register');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2 text-center text-xs font-semibold bg-slate-900 text-white rounded-lg"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
