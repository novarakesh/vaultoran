import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('trustvault_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('trustvault_token'));
  const [loading, setLoading] = useState(true);
  const [revocationNotice, setRevocationNotice] = useState(null);

  // Sync session and verify token validity on mount
  useEffect(() => {
    const verifyInitialSession = async () => {
      const storedToken = localStorage.getItem('trustvault_token');
      if (storedToken) {
        try {
          const res = await apiClient.get('/api/auth/me');
          setUser(res.data.user);
          localStorage.setItem('trustvault_user', JSON.stringify(res.data.user));
        } catch (err) {
          // Token invalid or revoked
          logout();
        }
      }
      setLoading(false);
    };

    verifyInitialSession();

    // Event listener for 401 session revocation triggered by Axios interceptor
    const handleRevocation = (e) => {
      setUser(null);
      setToken(null);
      setRevocationNotice(e.detail || 'Session revoked. Please log in again.');
    };

    window.addEventListener('trustvault_session_revoked', handleRevocation);
    return () => window.removeEventListener('trustvault_session_revoked', handleRevocation);
  }, []);

  const login = async (email, password) => {
    setRevocationNotice(null);
    const res = await apiClient.post('/api/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('trustvault_token', receivedToken);
    localStorage.setItem('trustvault_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (name, email, password, role) => {
    setRevocationNotice(null);
    const res = await apiClient.post('/api/auth/register', { name, email, password, role });
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('trustvault_token', receivedToken);
    localStorage.setItem('trustvault_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem('trustvault_token');
    localStorage.removeItem('trustvault_user');
    setToken(null);
    setUser(null);
  };

  const logoutAll = async () => {
    try {
      await apiClient.post('/api/auth/logout-all');
    } catch (err) {
      console.warn('Revocation call failed:', err);
    } finally {
      logout();
      setRevocationNotice('All active sessions revoked successfully. Please re-authenticate.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        revocationNotice,
        setRevocationNotice,
        login,
        register,
        logout,
        logoutAll,
        isAdmin: user?.role === 'admin',
        isOwner: user?.role === 'owner',
        isViewer: user?.role === 'viewer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
