import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './store/AppContext';
import Navbar from './components/Navbar';
import AccessibilityPanel from './components/AccessibilityPanel';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OTPPage from './pages/OTPPage';
import ModeSelectPage from './pages/ModeSelectPage';
import HomePage from './pages/HomePage';
import FindRidePage from './pages/FindRidePage';
import OfferRidePage from './pages/OfferRidePage';
import SubscribePage from './pages/SubscribePage';
import HostDashboard from './pages/HostDashboard';
import DashboardPage from './pages/DashboardPage';
import AdminPanel from './pages/AdminPanel';
import ProfilePage from './pages/ProfilePage';
import AdminLoginPage from './pages/AdminLoginPage';

// ─── Guards ───────────────────────────────────────────────────────────────────

/** Any logged-in user (guest, host, admin) */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

/** Only role === 'admin'. Everyone else → /dashboard */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useApp();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function Layout({ children, showNavbar = true }: { children: React.ReactNode; showNavbar?: boolean }) {
  return (
    <>
      {showNavbar && <Navbar />}
      {children}
      <AccessibilityPanel />
    </>
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Layout showNavbar={false}><LandingPage /></Layout>} />

      {/* Auth */}
      <Route path="/auth/login"       element={<AuthPage />} />
      <Route path="/auth/signup"      element={<AuthPage />} />  {/* alias */}
      <Route path="/auth/otp"         element={<OTPPage />} />
      <Route path="/auth/mode-select" element={<ProtectedRoute><ModeSelectPage /></ProtectedRoute>} />
      <Route path="/admin/login"      element={<AdminLoginPage />} />

      {/* Normal user pages — any authenticated user */}
      <Route path="/home"      element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/profile"   element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />

      {/* Guest routes */}
      <Route path="/guest/find"      element={<Layout><FindRidePage /></Layout>} />
      <Route path="/guest/subscribe" element={<Layout><SubscribePage /></Layout>} />

      {/* Host routes */}
      <Route path="/host/offer"     element={<Layout><OfferRidePage /></Layout>} />
      <Route path="/host/dashboard" element={<ProtectedRoute><Layout><HostDashboard /></Layout></ProtectedRoute>} />

      {/* Admin — role === 'admin' only. Any other user gets redirected to /dashboard */}
      <Route path="/admin/*" element={<AdminRoute><AdminPanel /></AdminRoute>} />
      <Route path="/admin"   element={<AdminRoute><AdminPanel /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
