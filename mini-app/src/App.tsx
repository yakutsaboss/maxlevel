import './i18n';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Onboarding } from '@/pages/Onboarding';
import { Navigation } from '@/components/Navigation';
import { PageTransition } from '@/components/PageTransition';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';
import { LazyPageWrapper } from '@/components/LazyPageWrapper';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OfflineBanner } from '@/components/OfflineBanner';
import { InstallPrompt } from '@/components/InstallPrompt';
import { SkipLink } from '@/components/SkipLink';
import { useTelegram } from '@/hooks/useTelegram';
import { useOnboarding } from '@/hooks/useOnboarding';
import { apiClient } from '@/api/client';
import type { OnboardingStep } from '@/hooks/useOnboarding';

// Lazy-loaded pages — all routes except Onboarding (needed for first-load flow)
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Quests = lazy(() => import('@/pages/Quests').then(m => ({ default: m.Quests })));
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const Achievements = lazy(() => import('@/pages/Achievements').then(m => ({ default: m.Achievements })));
const Leaderboard = lazy(() => import('@/pages/Leaderboard').then(m => ({ default: m.Leaderboard })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const Social = lazy(() => import('@/pages/Social').then(m => ({ default: m.Social })));
const TrophyCase = lazy(() => import('@/pages/TrophyCase').then(m => ({ default: m.TrophyCase })));
const Inventory = lazy(() => import('@/pages/Inventory').then(m => ({ default: m.Inventory })));
const Shop = lazy(() => import('@/pages/Shop').then(m => ({ default: m.Shop })));
const Analytics = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })));
const NotificationHistory = lazy(() => import('@/pages/NotificationHistory').then(m => ({ default: m.NotificationHistory })));
const Medications = lazy(() => import('@/pages/Medications').then(m => ({ default: m.Medications })));
const ActivityHub = lazy(() => import('@/pages/ActivityHub').then(m => ({ default: m.ActivityHub })));
const ActivityHistory = lazy(() => import('@/pages/ActivityHistory').then(m => ({ default: m.ActivityHistory })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminPlayerList = lazy(() => import('@/pages/admin/AdminPlayerList').then(m => ({ default: m.AdminPlayerList })));
const AdminPlayerDetail = lazy(() => import('@/pages/admin/AdminPlayerDetail').then(m => ({ default: m.AdminPlayerDetail })));

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
  const [questBadgeCount, setQuestBadgeCount] = useState(0);

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
      // On API error, default to NOT redirecting to onboarding.
      // Safer: existing users won't briefly see onboarding on network hiccups.
      // Individual pages handle their own auth failures.
      setNeedsOnboarding(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  // Fetch active quest count for navigation badge
  const fetchQuestBadge = useCallback(async () => {
    if (!user?.id || needsOnboarding) return;
    try {
      const res = await apiClient.getUserStats(user.id);
      if (res.success && res.data) {
        setQuestBadgeCount(res.data.activeQuests.length);
      }
    } catch { /* badge is non-critical */ }
  }, [user?.id, needsOnboarding]);

  useEffect(() => {
    if (!checkingOnboarding && !needsOnboarding) {
      fetchQuestBadge();
    }
  }, [checkingOnboarding, needsOnboarding, fetchQuestBadge]);

  // Derive synchronously: if store says completed, override needsOnboarding immediately
  // This prevents the race where useEffect fires too late and ProtectedRoute redirects back
  const effectiveNeedsOnboarding = needsOnboarding && !store.isCompleted;

  if (checkingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
        <div className="text-telegram-hint animate-pulse">Loading...</div>
      </div>
    );
  }

  const isOnboardingRoute = location.pathname === '/onboarding';
  const showNavigation = !isOnboardingRoute && !effectiveNeedsOnboarding;

  return (
    <div className="app-container">
      <SkipLink />
      <OfflineBanner />
      <main id="main-content">
      <PageTransition>
        <Routes location={location}>
          <Route
            path="/"
            element={
              effectiveNeedsOnboarding
                ? <Navigate to="/onboarding" replace />
                : <Navigate to="/dashboard" replace />
            }
          />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Dashboard"><Dashboard /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/quests" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Quests"><Quests /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Profile"><Profile /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Leaderboard"><Leaderboard /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/social" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Social"><Social /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Achievements"><Achievements /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Settings"><Settings /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/trophies" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Trophies"><TrophyCase /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Inventory"><Inventory /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/shop" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Shop"><Shop /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/shop/:itemId" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Shop"><Shop /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Analytics"><Analytics /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/medications" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Medications"><Medications /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Notifications"><NotificationHistory /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Activity"><ActivityHub /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/activity/history" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><PageErrorBoundary pageName="Activity History"><ActivityHistory /></PageErrorBoundary></ProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<LazyPageWrapper><PageErrorBoundary pageName="Admin Dashboard"><AdminDashboard /></PageErrorBoundary></LazyPageWrapper>} />
          <Route path="/admin/players" element={<LazyPageWrapper><PageErrorBoundary pageName="Admin Players"><AdminPlayerList /></PageErrorBoundary></LazyPageWrapper>} />
          <Route path="/admin/players/:userId" element={<LazyPageWrapper><PageErrorBoundary pageName="Admin Player"><AdminPlayerDetail /></PageErrorBoundary></LazyPageWrapper>} />
        </Routes>
      </PageTransition>
      </main>
      <InstallPrompt />
      {showNavigation && <Navigation questBadgeCount={questBadgeCount} />}
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
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-telegram-bg"><div className="text-telegram-hint animate-pulse">Loading...</div></div>}>
          <BrowserRouter basename="/levelapp">
            <AppContent />
          </BrowserRouter>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
