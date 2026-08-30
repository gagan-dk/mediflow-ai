import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
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

const AppContent: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const { isAuthenticated, currentUser, login } = useApp();

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
        return <HospitalCommandCenterPage />;
      case '/ambulances':
        return <EmergencyTransportPage navigate={navigate} />;
      case '/journey':
        return <PatientJourneyPage navigate={navigate} />;
      case '/insights':
        return <SystemInsightsPage navigate={navigate} />;
      case '/privacy':
        return <PrivacySecurityPage />;
      default:
        return <LandingPage navigate={navigate} />;
    }
  };

  const handleLoginSuccess = (role: string) => {
    // All users go to home page after login, they can navigate from there
    navigate('/');
  };

  // Gate: show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
