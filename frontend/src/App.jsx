import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import OwnerPortal from './pages/OwnerPortal';
import ViewerDashboard from './pages/ViewerDashboard';
import AdminAuditLogs from './pages/AdminAuditLogs';

// Smart Landing Redirect based on authenticated user's role
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vault-950">
        <div className="w-10 h-10 border-4 border-cyber-cyan/20 border-t-cyber-cyan rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/audit" replace />;
  if (user.role === 'owner') return <Navigate to="/owner" replace />;
  return <Navigate to="/viewer" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-vault-950 text-slate-100">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Owner Portal (Owners & Admins) */}
              <Route
                path="/owner"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <OwnerPortal />
                  </ProtectedRoute>
                }
              />

              {/* Viewer Dashboard (Viewers & Admins) */}
              <Route
                path="/viewer"
                element={
                  <ProtectedRoute allowedRoles={['viewer', 'admin']}>
                    <ViewerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Audit SOC (Strictly Admins) */}
              <Route
                path="/audit"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAuditLogs />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
