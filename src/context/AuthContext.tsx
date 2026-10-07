import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PatientProfile, DoctorProfile } from '../types';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  profile: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  authDefaultRole: 'patient' | 'doctor';
  openAuthModal: (mode?: 'login' | 'register', role?: 'patient' | 'doctor') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authDefaultRole, setAuthDefaultRole] = useState<'patient' | 'doctor'>('patient');

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getCurrentUser();
      setUser(res.user);
      setProfile(res.profile);
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      clearStoredToken();
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (token: string, newUser: User) => {
    setStoredToken(token);
    setUser(newUser);
    await refreshUser();
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
    setProfile(null);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login', role: 'patient' | 'doctor' = 'patient') => {
    setAuthModalMode(mode);
    setAuthDefaultRole(role);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        isAuthModalOpen,
        authModalMode,
        authDefaultRole,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
