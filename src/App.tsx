import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/landing/LandingPage';
import { DoctorSearch } from './components/patient/DoctorSearch';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { MedicalDriveView } from './components/patient/MedicalDriveView';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { DoctorAvailabilityManager } from './components/doctor/DoctorAvailabilityManager';
import { DoctorSharedRecordsView } from './components/doctor/DoctorSharedRecordsView';
import { ChatView } from './components/chat/ChatView';
import { AdminVerificationPortal } from './components/admin/AdminVerificationPortal';
import { EmergencyModal } from './components/emergency/EmergencyModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { AuthModal } from './components/auth/AuthModal';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [adminTokenParam, setAdminTokenParam] = useState<string | null>(null);
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);

  // Check URL parameters for direct admin review tokens or tabs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setAdminTokenParam(token);
      setCurrentTab('admin-portal');
    }
  }, []);

  // When user logs in, route to appropriate dashboard if on home tab
  useEffect(() => {
    if (isAuthenticated && currentTab === 'home') {
      if (user?.role === 'doctor') {
        setCurrentTab('doctor-dashboard');
      } else if (user?.role === 'patient') {
        setCurrentTab('appointments');
      }
    }
  }, [isAuthenticated, user]);

  const handleStartChat = (recipientId: string) => {
    setChatRecipientId(recipientId);
    setCurrentTab('chat');
  };

  const handleNavigateFromDrawer = (link: string) => {
    if (link.includes('appointment')) {
      setCurrentTab(user?.role === 'doctor' ? 'doctor-dashboard' : 'appointments');
    } else if (link.includes('chat')) {
      setCurrentTab('chat');
    } else if (link.includes('record') || link.includes('drive')) {
      setCurrentTab(user?.role === 'doctor' ? 'doctor-shared-records' : 'medical-drive');
    } else if (link.includes('admin') || link.includes('verify')) {
      setCurrentTab('admin-portal');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Bar */}
      <Navbar
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        currentTab={currentTab}
        onSelectTab={tab => {
          setChatRecipientId(null);
          setCurrentTab(tab);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'home' && (
          <LandingPage
            onFindDoctor={() => setCurrentTab('doctors')}
            onOpenEmergency={() => setIsEmergencyOpen(true)}
          />
        )}

        {currentTab === 'doctors' && (
          <DoctorSearch
            onAppointmentBooked={() => setCurrentTab('appointments')}
          />
        )}

        {currentTab === 'appointments' && (
          <PatientDashboard
            onNavigateTab={setCurrentTab}
            onOpenEmergency={() => setIsEmergencyOpen(true)}
            onStartChatWithDoctor={handleStartChat}
          />
        )}

        {currentTab === 'medical-drive' && <MedicalDriveView />}

        {currentTab === 'doctor-dashboard' && (
          <DoctorDashboard
            onNavigateTab={setCurrentTab}
            onStartChatWithPatient={handleStartChat}
          />
        )}

        {currentTab === 'doctor-availability' && <DoctorAvailabilityManager />}

        {currentTab === 'doctor-shared-records' && <DoctorSharedRecordsView />}

        {currentTab === 'chat' && (
          <ChatView
            initialRecipientId={chatRecipientId}
            onFindDoctor={() => setCurrentTab('doctors')}
          />
        )}

        {currentTab === 'admin-portal' && (
          <AdminVerificationPortal initialToken={adminTokenParam} />
        )}
      </main>

      {/* Footer */}
      <Footer onOpenEmergency={() => setIsEmergencyOpen(true)} />

      {/* Emergency Assistance Modal */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />

      {/* Real-time Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={handleNavigateFromDrawer}
      />

      {/* Authentication Modal */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
