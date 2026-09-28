// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/LoginPage';
import LandingPage from '../pages/LandingPage';
import KryptonPage from '../pages/modules/krypton/KryptonPage';
import SimpleSuitePage from '../pages/modules/simple-suite/SimpleSuitePage';
import PempalPage from '../pages/modules/pempal/PempalPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="p-8">Loading…</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/"                       element={<LandingPage />} />
        <Route path="/modules/krypton"        element={<KryptonPage />} />
        <Route path="/modules/simple-suite"   element={<SimpleSuitePage />} />
        <Route path="/modules/pempal"         element={<PempalPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}