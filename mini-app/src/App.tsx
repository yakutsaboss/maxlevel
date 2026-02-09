import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { lazy, useEffect, useState } from 'react';
import { Dashboard } from '@/pages/Dashboard';
import { Quests } from '@/pages/Quests';
import { Profile } from '@/pages/Profile';
import { Onboarding } from '@/pages/Onboarding';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LazyPageWrapper } from '@/components/LazyPageWrapper';
import { useTelegram } from '@/hooks/useTelegram';
import { useOnboarding } from '@/hooks/useOnboarding';
import { apiClient } from '@/api/client';
import type { OnboardingStep } from '@/hooks/useOnboarding';

// Lazy-loaded pages (non-critical path)
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })));
const Achievements = lazy(() => import('@/pages/Achievements').then(m => ({ default: m.Achievements })));
const Leaderboard = lazy(() => import('@/pages/Leaderboard').then(m => ({ default: m.Leaderboard })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

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
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <PageWrapper><Dashboard /></PageWrapper>}
        />
        <Route
          path="/quests"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <PageWrapper><Quests /></PageWrapper>}
        />
        <Route
          path="/profile"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <PageWrapper><Profile /></PageWrapper>}
        />
        <Route
          path="/leaderboard"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <LazyPageWrapper><PageWrapper><Leaderboard /></PageWrapper></LazyPageWrapper>}
        />
        <Route
          path="/achievements"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <LazyPageWrapper><PageWrapper><Achievements /></PageWrapper></LazyPageWrapper>}
        />
        <Route
          path="/settings"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <LazyPageWrapper><PageWrapper><Settings /></PageWrapper></LazyPageWrapper>}
        />
        <Route path="/admin" element={<LazyPageWrapper><Admin /></LazyPageWrapper>} />
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
      <ErrorBoundary>
        <BrowserRouter basename="/levelapp">
          <AppContent />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
