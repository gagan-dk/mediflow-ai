import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PreAlertBanner } from './components/PreAlertBanner';
import { ReroutingAlertModal } from './components/ReroutingAlertModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { EmergencyAssessmentPage } from './pages/EmergencyAssessmentPage';
import { AssessmentResultPage } from './pages/AssessmentResultPage';
import { HospitalFinderPage } from './pages/HospitalFinderPage';
import { LiveQueuePage } from './pages/LiveQueuePage';
import { HospitalCommandCenterPage } from './pages/HospitalCommandCenterPage';
import { EmergencyTransportPage } from './pages/EmergencyTransportPage';
import { PatientJourneyPage } from './pages/PatientJourneyPage';
import { SystemInsightsPage } from './pages/SystemInsightsPage';
import { PrivacySecurityPage } from './pages/PrivacySecurityPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HospitalManagementPage } from './pages/HospitalManagementPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const [registrationRole, setRegistrationRole] = useState<'patient' | 'hospital_staff'>('patient');
  const { isAuthenticated, authLoading, sessionExpired, currentUser, login } = useApp();

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/':
        return <LandingPage navigate={navigate} />;
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
        return <SystemInsightsPage navigate={navigate} />; // Placeholder for Admin Dashboard
      default:
        return <LandingPage navigate={navigate} />;
    }
  };

  const handleLoginSuccess = (role: string) => {
    switch (role) {
      case 'hospital_staff':
        navigate('/');
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

  useEffect(() => {
    if (!isAuthenticated) return;
    if (currentUser.role === 'admin' && currentPath === '/') {
      setCurrentPath('/admin');
    }
  }, [currentPath, currentUser.role, isAuthenticated]);

  // Gate: show loading while checking session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <div className="text-sm text-slate-400 font-medium">Restoring session...</div>
        </div>
      </div>
    );
  }

  // Gate: show login page if not authenticated
  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterPage registrationRole={registrationRole} onRegisterSuccess={handleLoginSuccess} onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <LoginPage onLoginSuccess={handleLoginSuccess} sessionExpired={sessionExpired} onSwitchToRegister={(role) => { setRegistrationRole(role === 'hospital_staff' ? 'hospital_staff' : 'patient'); setShowRegister(true); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-brand-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      {/* Top Pre-Alert Emergency Active Banner */}
      <PreAlertBanner />

      {/* Main Navbar */}
      <Navbar currentPath={currentPath} navigate={navigate} />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {renderCurrentPage()}
      </main>

      {/* Dynamic Hospital Re-Routing Alert Modal */}
      <ReroutingAlertModal />

      {/* Global Footer */}
      <Footer navigate={navigate} />
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
