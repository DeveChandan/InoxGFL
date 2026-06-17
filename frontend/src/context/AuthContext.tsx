import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'VENDOR_ADMIN' | 'EMPLOYEE';
  vendor: string;
  vendor_code?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalDev) {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      if (storedUser && storedToken) {
        try {
          return JSON.parse(storedUser);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  
  const [loading, setLoading] = useState(() => {
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    return !isLocalDev;
  });
  const [authError, setAuthError] = useState('');

  const login = (userData: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
    setAuthError('');
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  useEffect(() => {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalDev) {
      setLoading(false);
      return;
    }

    const checkBtpSession = async () => {
      try {
        setLoading(true);
        // Call login with empty payload to authenticate via BTP Session
        const response = await api.post('/auth/login', {});
        login(response.data.user, response.data.token);
      } catch (err: any) {
        console.warn('BTP Session auto-login failed or not registered:', err);
        logout();
        
        // Extract registration or inactive vendor error messages
        if (err.response?.status === 403) {
          setAuthError(err.response.data.message || 'Access Denied: You are not registered in the system.');
        } else {
          setAuthError('Authentication failed. Please check your SAP BTP session.');
        }
      } finally {
        setLoading(false);
      }
    };

    checkBtpSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
