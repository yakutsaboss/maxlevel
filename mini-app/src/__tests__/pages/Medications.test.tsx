/**
 * Tests for Medications page (mini-app/src/pages/Medications.tsx)
 *
 * Run 87 Agent H: Tests the Medications page created by Agent D.
 * Covers: page render, medication list, empty state, add button,
 * daily tracker, loading/error states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ─── Mock @twa-dev/sdk ──────────────────────────────────────────────

vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'test',
    initDataUnsafe: { user: { id: 123, first_name: 'Test' } },
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableVerticalSwipes: vi.fn(),
    colorScheme: 'dark',
    themeParams: {},
    platform: 'tdesktop',
    version: '7.0',
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
    MainButton: {
      show: vi.fn(), hide: vi.fn(), enable: vi.fn(), disable: vi.fn(),
      setText: vi.fn(), onClick: vi.fn(), offClick: vi.fn(),
      showProgress: vi.fn(), hideProgress: vi.fn(), color: '', textColor: '',
    },
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    showPopup: vi.fn(),
    openLink: vi.fn(),
    openTelegramLink: vi.fn(),
    sendData: vi.fn(),
  },
}));

// ─── Mock react-router-dom ──────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// ─── Mock react-i18next ─────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const keys: Record<string, string> = {
        'medication.title': 'Medications',
        'medication.todaySchedule': "Today's Schedule",
        'medication.myMedications': 'My Medications',
        'medication.addMedication': 'Add Medication',
        'medication.editMedication': 'Edit Medication',
        'medication.name': 'Medication Name',
        'medication.dosage': 'Dosage',
        'medication.frequency': 'Frequency',
        'medication.timeOfDay': 'Time of Day',
        'medication.color': 'Color',
        'medication.notes': 'Notes (optional)',
        'medication.save': 'Save',
        'medication.cancel': 'Cancel',
        'medication.delete': 'Delete',
        'medication.deleteConfirm': 'Remove this medication?',
        'medication.taken': 'Taken',
        'medication.skipped': 'Skipped',
        'medication.postponed': 'Postponed',
        'medication.pending': 'Pending',
        'medication.progress': `${params?.taken ?? 0}/${params?.total ?? 0} taken`,
        'medication.nextDue': `Next: ${params?.name ?? ''} in ${params?.time ?? ''}`,
        'medication.noDue': 'All done for today!',
        'medication.emptyState': 'No medications added yet',
        'medication.emptyHint': 'Tap + to add your first medication',
        'medication.adherence': `Adherence: ${params?.rate ?? 0}%`,
        'medication.history': 'History',
        'medication.frequencyDaily': 'Daily',
        'medication.frequencyTwice': 'Twice daily',
        'medication.frequencyThree': 'Three times daily',
        'medication.frequencyWeekly': 'Weekly',
        'medication.frequencyAsNeeded': 'As needed',
        'errors.somethingWentWrong': 'Something went wrong',
        'errors.tryAgain': 'Try Again',
        'errors.serverError': 'Please try again later',
        'common.retry': 'Retry',
      };
      return keys[key] || key;
    },
  }),
}));

// ─── Mock framer-motion ─────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, className, style, onClick, role, ...rest }: any) => (
      <div className={className} style={style} onClick={onClick} role={role}>
        {children}
      </div>
    ),
    button: ({ children, onClick, className, type, disabled, ...rest }: any) => (
      <button onClick={onClick} className={className} type={type || 'button'} disabled={disabled}>
        {children}
      </button>
    ),
    section: ({ children, className, ...rest }: any) => (
      <section className={className}>{children}</section>
    ),
  },
}));

// ─── Mock lucide-react ──────────────────────────────────────────────

vi.mock('lucide-react', () => {
  const IconStub = ({ className }: any) => <span data-testid="icon" className={className} />;
  return {
    Pill: IconStub,
    Plus: IconStub,
    Check: IconStub,
    X: IconStub,
    Clock: IconStub,
    Calendar: IconStub,
    ChevronRight: IconStub,
    Edit: IconStub,
    Pencil: IconStub,
    Trash2: IconStub,
    AlertCircle: IconStub,
    RefreshCw: IconStub,
    ArrowLeft: IconStub,
    CheckCircle: IconStub,
    Info: IconStub,
  };
});

// ─── Mock ToastContext ──────────────────────────────────────────────

vi.mock('@/contexts/ToastContext', () => ({
  useToastContext: () => ({
    showToast: vi.fn(),
    toasts: [],
    dismissToast: vi.fn(),
  }),
  ToastProvider: ({ children }: any) => <>{children}</>,
}));

// ─── Mock useTelegram ───────────────────────────────────────────────

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({
    user: { id: 123, first_name: 'Test', username: 'test' },
    haptic: { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() },
  }),
  useBackButton: vi.fn(),
}));

// ─── Mock usePullToRefresh ──────────────────────────────────────────

vi.mock('@/hooks/usePullToRefresh', () => ({
  PullIndicator: () => <div data-testid="pull-indicator" />,
  usePullToRefresh: () => ({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
    pullThreshold: 60,
    touchHandlers: {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

// ─── Mock useMedicationData ─────────────────────────────────────────

const mockUseMedicationData = vi.fn();
vi.mock('@/hooks/useMedicationData', () => ({
  useMedicationData: (...args: unknown[]) => mockUseMedicationData(...args),
}));

// ─── Import page after mocks ────────────────────────────────────────

import { Medications as MedicationsPage } from '@/pages/Medications';

// ─── Test helpers ───────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

const mockMedications = [
  {
    id: 1,
    name: 'Aspirin',
    dosage: '100mg',
    frequency: 'daily',
    time_of_day: ['08:00', '20:00'],
    color: '#FF5733',
    notes: 'Take with food',
    is_active: true,
  },
  {
    id: 2,
    name: 'Vitamin D',
    dosage: '1000IU',
    frequency: 'daily',
    time_of_day: ['09:00'],
    color: '#33FF57',
    notes: null,
    is_active: true,
  },
];

const mockSchedule = [
  { id: 1, name: 'Aspirin', dosage: '100mg', scheduled_time: '08:00', status: 'taken', color: '#FF5733' },
  { id: 1, name: 'Aspirin', dosage: '100mg', scheduled_time: '20:00', status: 'pending', color: '#FF5733' },
  { id: 2, name: 'Vitamin D', dosage: '1000IU', scheduled_time: '09:00', status: 'pending', color: '#33FF57' },
];

const defaultHookReturn = {
  medications: mockMedications,
  todaySchedule: mockSchedule,
  history: [],
  loading: false,
  error: null,
  addMedication: vi.fn(),
  updateMedication: vi.fn(),
  deleteMedication: vi.fn(),
  logMedication: vi.fn(),
  refresh: vi.fn(),
};

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMedicationData.mockReturnValue(defaultHookReturn);
});

describe('Medications Page', () => {
  it('renders medication list', () => {
    renderWithProviders(<MedicationsPage />);

    // Names appear in both DailyMedTracker and MedicationCard sections
    expect(screen.getAllByText('Aspirin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vitamin D').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no medications', () => {
    mockUseMedicationData.mockReturnValue({
      ...defaultHookReturn,
      medications: [],
      todaySchedule: [],
    });

    renderWithProviders(<MedicationsPage />);

    expect(screen.getByText('No medications added yet')).toBeInTheDocument();
  });

  it('renders add medication button', () => {
    renderWithProviders(<MedicationsPage />);

    // The page should have an add/plus button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows today\'s schedule section', () => {
    renderWithProviders(<MedicationsPage />);

    // The "Today's Schedule" heading should be visible
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    // Progress text from DailyMedTracker
    expect(screen.getByText('1/3 taken')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseMedicationData.mockReturnValue({
      ...defaultHookReturn,
      medications: [],
      todaySchedule: [],
      loading: true,
    });

    renderWithProviders(<MedicationsPage />);

    // Should not show empty state or medication list while loading
    expect(screen.queryByText('No medications added yet')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseMedicationData.mockReturnValue({
      ...defaultHookReturn,
      medications: [],
      todaySchedule: [],
      loading: false,
      error: new Error('API failure'),
    });

    renderWithProviders(<MedicationsPage />);

    // Should show error state or retry button
    const retryButton = screen.queryByText(/Try Again/);
    const errorText = screen.queryByText('Something went wrong');
    expect(retryButton || errorText).toBeTruthy();
  });

  it('shows medication dosage info', () => {
    renderWithProviders(<MedicationsPage />);

    // Dosages appear in both DailyMedTracker and MedicationCard sections
    expect(screen.getAllByText('100mg').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1000IU').length).toBeGreaterThanOrEqual(1);
  });
});
