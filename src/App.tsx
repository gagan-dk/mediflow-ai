import React, { useState, useEffect, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Sidebar } from './components/Sidebar';
import { AppHeader } from './components/AppHeader';
import { NotificationDrawer } from './components/NotificationDrawer';
import { PreAlertBanner } from './components/PreAlertBanner';
import { ReroutingAlertModal } from './components/ReroutingAlertModal';
import { ErrorBoundary } from './components/ErrorBoundary';

// ─── Route-level lazy imports (PERF-01) ─────────────────────────────────────
const LandingPage            = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AskMediFlashPage       = React.lazy(() => import('./pages/AskMediFlashPage').then(m => ({ default: m.AskMediFlashPage })));
const EmergencyAssessmentPage = React.lazy(() => import('./pages/EmergencyAssessmentPage').then(m => ({ default: m.EmergencyAssessmentPage })));
const AssessmentResultPage   = React.lazy(() => import('./pages/AssessmentResultPage').then(m => ({ default: m.AssessmentResultPage })));
const HospitalFinderPage     = React.lazy(() => import('./pages/HospitalFinderPage').then(m => ({ default: m.HospitalFinderPage })));
const LiveQueuePage          = React.lazy(() => import('./pages/LiveQueuePage').then(m => ({ default: m.LiveQueuePage })));
const HospitalCommandCenterPage = React.lazy(() => import('./pages/HospitalCommandCenterPage').then(m => ({ default: m.HospitalCommandCenterPage })));
const EmergencyTransportPage = React.lazy(() => import('./pages/EmergencyTransportPage').then(m => ({ default: m.EmergencyTransportPage })));
const PatientJourneyPage     = React.lazy(() => import('./pages/PatientJourneyPage').then(m => ({ default: m.PatientJourneyPage })));
const SystemInsightsPage     = React.lazy(() => import('./pages/SystemInsightsPage').then(m => ({ default: m.SystemInsightsPage })));
const PrivacySecurityPage    = React.lazy(() => import('./pages/PrivacySecurityPage').then(m => ({ default: m.PrivacySecurityPage })));
const LoginPage              = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage           = React.lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const HospitalManagementPage = React.lazy(() => import('./pages/HospitalManagementPage').then(m => ({ default: m.HospitalManagementPage })));
const ProfilePage            = React.lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage           = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

// ─── Page-level loading fallback ─────────────────────────────────────────────
const PageSkeleton: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh]" aria-live="polite" aria-label="Loading page">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      <span className="text-sm text-slate-400 font-medium">Loading…</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const { isAuthenticated, authLoading, sessionExpired, currentUser, login } = useApp();

  // ─── URL sync: update browser history on navigation (ADR-001) ─────────────
  const navigate = (path: string) => {
    setCurrentPath(path);
    window.history.pushState(null, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/':
        return <LandingPage navigate={navigate} />;
      case '/ask':
        return <AskMediFlashPage navigate={navigate} />;
      case '/assessment':
        return <EmergencyAssessmentPage navigate={navigate} />;
      case '/assessment-result':
        return <AssessmentResultPage navigate={navigate} />;
      case '/finder':
        return <HospitalFinderPage navigate={navigate} />;
      case '/queue':
        return <LiveQueuePage navigate={navigate} />;
      case '/command-center':
        if (currentUser?.role !== 'hospital_staff' && currentUser?.role !== 'admin') {
          navigate('/');
          return null;
        }
        return <HospitalCommandCenterPage />;
      case '/ambulances':
        return <EmergencyTransportPage navigate={navigate} />;
      case '/journey':
        return <PatientJourneyPage navigate={navigate} />;
      case '/insights':
        if (currentUser?.role !== 'admin') {
          navigate('/');
          return null;
        }
        return <SystemInsightsPage navigate={navigate} />;
      case '/privacy':
        return <PrivacySecurityPage />;
      case '/hospital':
        if (currentUser?.role !== 'hospital_staff' && currentUser?.role !== 'admin') {
          navigate('/');
          return null;
        }
        return <HospitalManagementPage navigate={navigate} />;
      case '/profile':
        return <ProfilePage />;
      case '/settings':
        return <SettingsPage />;
      case '/admin':
        if (currentUser?.role !== 'admin') {
          navigate('/');
          return null;
        }
        return <SystemInsightsPage navigate={navigate} />;
      default:
        return <LandingPage navigate={navigate} />;
    }
  };

  const handleLoginSuccess = (role: string) => {
    switch (role) {
      case 'hospital_staff':
        navigate('/hospital');
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'patient':
      default:
        navigate('/');
        break;
    }
  };

  // Gate: show loading while checking session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Restoring session…</p>
        </div>
      </div>
    );
  }

  // Gate: show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        {showRegister ? (
          <RegisterPage
            onRegisterSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            sessionExpired={sessionExpired}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9f9] text-[#14201f] flex flex-col font-sans">
      {/* ACC-06: Skip navigation link — first focusable element */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      {/* Top Pre-Alert Emergency Active Banner */}
      <PreAlertBanner />

      {/* Left Sidebar (Desktop persistent, Mobile drawer) */}
      <Sidebar
        currentPath={currentPath}
        navigate={navigate}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area (Offset by sidebar on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all">
        {/* Top Header Bar with Search, Language & Profile */}
        <AppHeader
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          navigate={navigate}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        />

        {/* Main Page Canvas */}
        <main
          id="main-content"
          className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
          tabIndex={-1}
        >
          {/* Per-route ErrorBoundary (A-32) */}
          <ErrorBoundary key={currentPath}>
            <Suspense fallback={<PageSkeleton />}>
              {renderCurrentPage()}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Dynamic Hospital Re-Routing Alert Modal & Notification Drawer */}
        <ReroutingAlertModal />
        <NotificationDrawer
          isOpen={isNotificationDrawerOpen}
          onClose={() => setIsNotificationDrawerOpen(false)}
        />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
