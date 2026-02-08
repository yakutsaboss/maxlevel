import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '@/pages/Dashboard';
import { Quests } from '@/pages/Quests';
import { Profile } from '@/pages/Profile';
import { Onboarding } from '@/pages/Onboarding';
import { Navigation } from '@/components/Navigation';
import { useTelegram } from '@/hooks/useTelegram';
import { useOnboarding } from '@/hooks/useOnboarding';
import { apiClient } from '@/api/client';
import { useEffect, useState } from 'react';
import type { OnboardingStep } from '@/hooks/useOnboarding';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const { user } = useTelegram();
  const location = useLocation();
  const store = useOnboarding();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingState();
  }, [user?.id]);

  const checkOnboardingState = async () => {
    if (!user?.id) {
      setCheckingOnboarding(false);
      return;
    }

    try {
      const res = await apiClient.getOnboardingState(user.id);
      if (res.success && res.data?.current_step === 'completed') {
        setNeedsOnboarding(false);
        store.setCompleted();
      } else if (res.success && res.data?.current_step) {
        // Resume from saved step
        setNeedsOnboarding(true);
        store.restoreState(
          res.data.current_step as OnboardingStep,
          res.data.quiz_data || {}
        );
      } else {
        // No onboarding state = new user
        setNeedsOnboarding(true);
      }
    } catch {
      // If API fails, assume new user needs onboarding
      setNeedsOnboarding(true);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  if (checkingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
        <div className="text-telegram-hint animate-pulse">Loading...</div>
      </div>
    );
  }

  const isOnboardingRoute = location.pathname === '/onboarding';
  const showNavigation = !isOnboardingRoute && !needsOnboarding;

  return (
    <div className="app-container">
      <Routes>
        <Route
          path="/"
          element={
            needsOnboarding
              ? <Navigate to="/onboarding" replace />
              : <Navigate to="/dashboard" replace />
          }
        />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/dashboard"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard />}
        />
        <Route
          path="/quests"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Quests />}
        />
        <Route
          path="/profile"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Profile />}
        />
      </Routes>
      {showNavigation && <Navigation />}
    </div>
  );
}

function App() {
  const { ready, expand } = useTelegram();

  useEffect(() => {
    // Initialize Telegram WebApp
    ready();
    expand();

    // Set viewport height for mobile
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);

    return () => window.removeEventListener('resize', setVH);
  }, [ready, expand]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
