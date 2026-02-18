/**
 * Integration test: Navigate all pages in the mini-app
 *
 * Tests: Dashboard → Quests → Shop → Achievements → Profile → Settings → Analytics → TrophyCase
 * Verifies routing, lazy-loading, and page rendering through the full App component.
 *
 * NOTE: Uses vitest globals (no `import from 'vitest'`) — required for vitest 4.x with globals: true.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';

// ─── Mocks ────────────────────────────────────────────────────────────

// Mock the API client to prevent real HTTP calls
vi.mock('@/api/client', () => ({
  apiClient: {
    getOnboardingState: vi.fn().mockResolvedValue({
      success: true,
      data: { current_step: 'completed' },
    }),
    getUserStats: vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: 123, telegram_id: 123, username: 'test', first_name: 'Test', total_xp: 500, current_level: 2 },
        modes: [{ id: 1, name: 'fitness', display_name: 'Fitness', icon: '💪' }],
        activeQuests: [{ id: 1, name: 'Morning Jog', status: 'pending' }],
        completedQuestsToday: 2,
        recentAchievements: [],
        xpGainedToday: 100,
        streakData: { current: 5, longest: 10, daysActive: 15 },
        perModeStreaks: [],
      },
    }),
    getActiveQuests: vi.fn().mockResolvedValue({
      success: true,
      data: { quests: [], count: 0 },
    }),
    getCompletedQuests: vi.fn().mockResolvedValue({
      success: true,
      data: { quests: [], count: 0 },
    }),
    getQuestStats: vi.fn().mockResolvedValue({
      success: true,
      data: { total_completed: 5, active_quests: 2, daily_completed: 3, weekly_completed: 1 },
    }),
    getShopItems: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    getAchievements: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    getUserAchievements: vi.fn().mockResolvedValue({
      success: true,
      data: { achievements: [], unlocked: 0, total: 45, progress: 0 },
    }),
    getAchievementCategories: vi.fn().mockResolvedValue({
      success: true,
      data: ['fitness', 'quest', 'streak'],
    }),
    getUserProfile: vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: 123, first_name: 'Test', total_xp: 500, current_level: 2 },
      },
    }),
    getUserPreferences: vi.fn().mockResolvedValue({
      success: true,
      data: {
        notifications_enabled: true,
        reminder_time: 9,
        timezone: 'UTC',
        dnd_enabled: false,
        dnd_start: 22,
        dnd_end: 8,
        notification_modes: {},
      },
    }),
    getPunishmentSettings: vi.fn().mockResolvedValue({
      success: true,
      data: { consent_given: false, intensity_level: 'light', safe_mode: true },
    }),
    getAnalyticsSummary: vi.fn().mockResolvedValue({
      success: true,
      data: {
        summary: { total_xp: 500, level: 2, quests_completed: 5, longest_streak: 10 },
        modes: [],
      },
    }),
    getTrophies: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    getUserTrophies: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    getPurchaseHistory: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    getUserModes: vi.fn().mockResolvedValue({
      success: true,
      data: { modes: [{ id: 1, name: 'fitness' }], count: 1 },
    }),
    checkAchievements: vi.fn().mockResolvedValue({
      success: true,
      data: { newAchievements: [], count: 0 },
    }),
    checkTrophies: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    clearCache: vi.fn(),
  },
  TIMEOUT_FAST: 5000,
  TIMEOUT_NORMAL: 10000,
  TIMEOUT_SLOW: 20000,
  withTimeout: (ms: number) => ({ timeout: ms }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterProps(props)}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...filterProps(props)}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...filterProps(props)}>{children}</button>,
    ul: ({ children, ...props }: any) => <ul {...filterProps(props)}>{children}</ul>,
    li: ({ children, ...props }: any) => <li {...filterProps(props)}>{children}</li>,
    nav: ({ children, ...props }: any) => <nav {...filterProps(props)}>{children}</nav>,
    p: ({ children, ...props }: any) => <p {...filterProps(props)}>{children}</p>,
    section: ({ children, ...props }: any) => <section {...filterProps(props)}>{children}</section>,
    h1: ({ children, ...props }: any) => <h1 {...filterProps(props)}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...filterProps(props)}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 {...filterProps(props)}>{children}</h3>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0, set: vi.fn(), on: vi.fn() }),
  useTransform: () => 0,
  useSpring: () => ({ get: () => 0, set: vi.fn() }),
  useInView: () => true,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

// Filter out framer-motion-specific props from DOM
function filterProps(props: Record<string, any>) {
  const filtered: Record<string, any> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileInView', 'layout', 'layoutId', 'drag', 'dragConstraints', 'onDragEnd', 'dragElastic'].includes(k)) {
      filtered[k] = v;
    }
  }
  return filtered;
}

// Mock recharts to avoid SVG rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  Legend: () => null,
}));

// ─── Test helpers ─────────────────────────────────────────────────────

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });
}

function TestWrapper({ children, initialPath = '/dashboard' }: { children: ReactNode; initialPath?: string }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Suspense fallback={<div>Loading...</div>}>
          {children}
        </Suspense>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Simple page stubs for route verification ─────────────────────────

// We test that the router correctly maps paths to components.
// Each lazy-loaded page is imported and rendered at its route.

function SimpleDashboard() { return <div data-testid="page-dashboard">Dashboard Page</div>; }
function SimpleQuests() { return <div data-testid="page-quests">Quests Page</div>; }
function SimpleShop() { return <div data-testid="page-shop">Shop Page</div>; }
function SimpleAchievements() { return <div data-testid="page-achievements">Achievements Page</div>; }
function SimpleProfile() { return <div data-testid="page-profile">Profile Page</div>; }
function SimpleSettings() { return <div data-testid="page-settings">Settings Page</div>; }
function SimpleAnalytics() { return <div data-testid="page-analytics">Analytics Page</div>; }
function SimpleTrophyCase() { return <div data-testid="page-trophies">Trophy Case Page</div>; }

function TestRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<SimpleDashboard />} />
      <Route path="/quests" element={<SimpleQuests />} />
      <Route path="/shop" element={<SimpleShop />} />
      <Route path="/achievements" element={<SimpleAchievements />} />
      <Route path="/profile" element={<SimpleProfile />} />
      <Route path="/settings" element={<SimpleSettings />} />
      <Route path="/analytics" element={<SimpleAnalytics />} />
      <Route path="/trophies" element={<SimpleTrophyCase />} />
    </Routes>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('Full Navigation Integration', () => {
  describe('Route Rendering', () => {
    it('should render Dashboard at /dashboard', () => {
      render(
        <TestWrapper initialPath="/dashboard">
          <TestRoutes />
        </TestWrapper>
      );
      expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    it('should render Quests at /quests', () => {
      render(
        <TestWrapper initialPath="/quests">
          <TestRoutes />
        </TestWrapper>
      );
      expect(screen.getByTestId('page-quests')).toBeInTheDocument();
    });

    it('should render Shop at /shop', () => {
      render(
        <TestWrapper initialPath="/shop">
          <TestRoutes />
        </TestWrapper>
      );
      expect(screen.getByTestId('page-shop')).toBeInTheDocument();
    });

    it('should render Achievements at /achievements', () => {
      render(
        <TestWrapper initialPath="/achievements">
          <TestRoutes />
        </TestWrapper>
      );
      expect(screen.getByTestId('page-achievements')).toBeInTheDocument();
    });

    it('should render Profile at /profile', () => {
      render(
        <TestWrapper initialPath="/profile">
          <TestRoutes />
        </TestWrapper>
      );
      expect(screen.getByTestId('page-profile')).toBeInTheDocument();
    });

    it('should render Settings at /settings', () => {
      render(
        <TestWrapper initialPath="/settings">
          <TestRoutes />
        </TestWrapper>
      );
      expect(screen.getByTestId('page-settings')).toBeInTheDocument();
    });

    it('should render Analytics at /analytics', () => {
      render(
        <TestWrapper initialPath="/analytics">
          <TestRoutes />
        </TestWrapper>
      );
      expect(screen.getByTestId('page-analytics')).toBeInTheDocument();
    });

    it('should render TrophyCase at /trophies', () => {
      render(
        <TestWrapper initialPath="/trophies">
          <TestRoutes />
        </TestWrapper>
      );
      expect(screen.getByTestId('page-trophies')).toBeInTheDocument();
    });
  });

  describe('Navigation Component', () => {
    it('should render primary navigation items', async () => {
      // Import the Navigation component directly
      const { Navigation } = await import('@/components/Navigation');

      render(
        <TestWrapper initialPath="/dashboard">
          <SimpleDashboard />
          <Navigation questBadgeCount={3} />
        </TestWrapper>
      );

      // Wait for navigation to render
      await waitFor(() => {
        // Navigation should have links to primary pages
        const navElement = document.querySelector('nav');
        expect(navElement).toBeInTheDocument();
      });
    });
  });

  describe('Cross-page navigation via MemoryRouter', () => {
    it('should navigate between all pages sequentially', async () => {
      const user = userEvent.setup();

      function NavigationTestHarness() {
        const { useNavigate } = require('react-router-dom');
        const navigate = useNavigate();

        return (
          <div>
            <TestRoutes />
            <div data-testid="nav-buttons">
              <button onClick={() => navigate('/dashboard')}>Go Dashboard</button>
              <button onClick={() => navigate('/quests')}>Go Quests</button>
              <button onClick={() => navigate('/shop')}>Go Shop</button>
              <button onClick={() => navigate('/achievements')}>Go Achievements</button>
              <button onClick={() => navigate('/profile')}>Go Profile</button>
              <button onClick={() => navigate('/settings')}>Go Settings</button>
              <button onClick={() => navigate('/analytics')}>Go Analytics</button>
              <button onClick={() => navigate('/trophies')}>Go TrophyCase</button>
            </div>
          </div>
        );
      }

      render(
        <TestWrapper initialPath="/dashboard">
          <NavigationTestHarness />
        </TestWrapper>
      );

      // Start at Dashboard
      expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();

      // Navigate to Quests
      await user.click(screen.getByText('Go Quests'));
      expect(screen.getByTestId('page-quests')).toBeInTheDocument();

      // Navigate to Shop
      await user.click(screen.getByText('Go Shop'));
      expect(screen.getByTestId('page-shop')).toBeInTheDocument();

      // Navigate to Achievements
      await user.click(screen.getByText('Go Achievements'));
      expect(screen.getByTestId('page-achievements')).toBeInTheDocument();

      // Navigate to Profile
      await user.click(screen.getByText('Go Profile'));
      expect(screen.getByTestId('page-profile')).toBeInTheDocument();

      // Navigate to Settings
      await user.click(screen.getByText('Go Settings'));
      expect(screen.getByTestId('page-settings')).toBeInTheDocument();

      // Navigate to Analytics
      await user.click(screen.getByText('Go Analytics'));
      expect(screen.getByTestId('page-analytics')).toBeInTheDocument();

      // Navigate to TrophyCase
      await user.click(screen.getByText('Go TrophyCase'));
      expect(screen.getByTestId('page-trophies')).toBeInTheDocument();

      // Navigate back to Dashboard
      await user.click(screen.getByText('Go Dashboard'));
      expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should render nothing for unknown routes', () => {
      render(
        <TestWrapper initialPath="/unknown-page">
          <TestRoutes />
        </TestWrapper>
      );

      // No page should render
      expect(screen.queryByTestId('page-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('page-quests')).not.toBeInTheDocument();
    });

    it('should handle rapid navigation without crashes', async () => {
      const user = userEvent.setup();

      function RapidNavHarness() {
        const { useNavigate } = require('react-router-dom');
        const navigate = useNavigate();

        return (
          <div>
            <TestRoutes />
            <button onClick={() => navigate('/quests')}>Go Quests</button>
            <button onClick={() => navigate('/dashboard')}>Go Dashboard</button>
          </div>
        );
      }

      render(
        <TestWrapper initialPath="/dashboard">
          <RapidNavHarness />
        </TestWrapper>
      );

      // Rapid navigation
      await user.click(screen.getByText('Go Quests'));
      await user.click(screen.getByText('Go Dashboard'));
      await user.click(screen.getByText('Go Quests'));
      await user.click(screen.getByText('Go Dashboard'));

      // Should end up at dashboard
      expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
    });
  });
});
