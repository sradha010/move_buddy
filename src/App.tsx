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

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
}

// Layout with Navbar
function Layout({ children, showNavbar = true }: { children: React.ReactNode; showNavbar?: boolean }) {
  return (
    <>
      {showNavbar && <Navbar />}
      {children}
      <AccessibilityPanel />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Layout showNavbar={false}><LandingPage /></Layout>} />

      {/* Auth Routes */}
      <Route path="/auth/login" element={<AuthPage />} />
      <Route path="/auth/otp" element={<OTPPage />} />
      <Route path="/auth/mode-select" element={<ModeSelectPage />} />

      {/* Protected Routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Layout>
              <HomePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Guest Routes */}
      <Route
        path="/guest/find"
        element={
          <Layout>
            <FindRidePage />
          </Layout>
        }
      />
      <Route
        path="/guest/subscribe"
        element={
          <Layout>
            <SubscribePage />
          </Layout>
        }
      />

      {/* Host Routes */}
      <Route
        path="/host/offer"
        element={
          <Layout>
            <OfferRidePage />
          </Layout>
        }
      />
      <Route
        path="/host/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <HostDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin Route */}
      <Route
        path="/admin"
        element={
          <Layout showNavbar={false}>
            <AdminPanel />
          </Layout>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
