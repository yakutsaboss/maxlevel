import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  Shield: ({ children, ...props }: any) => <span data-testid="shield-icon" {...props}>{children}</span>,
}));

vi.mock('@/utils/formatDate', () => ({
  formatDate: (d: string) => `formatted:${d}`,
}));

import { ProfileAccountability } from '@/components/profile/ProfileAccountability';

const mockHaptic = { impact: vi.fn() };
const mockNavigate = vi.fn();

const activePunishmentSettings = {
  consent_given: true,
  intensity_level: 'medium',
  safe_mode: true,
};

const punishmentHistory = [
  { xp_deducted: 50, punishment_type: 'skip', applied_at: '2026-01-10T00:00:00Z', notes: 'Skipped workout' },
  { xp_deducted: 30, punishment_type: 'late', applied_at: '2026-01-09T00:00:00Z', notes: '' },
];

describe('ProfileAccountability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders accountability section heading', () => {
    render(
      <ProfileAccountability
        punishmentSettings={null}
        punishmentHistory={[]}
        haptic={mockHaptic}
        onNavigateSettings={mockNavigate}
      />
    );
    expect(screen.getByText('Accountability')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /accountability/i })).toBeInTheDocument();
  });

  it('shows active status when consent given', () => {
    render(
      <ProfileAccountability
        punishmentSettings={activePunishmentSettings}
        punishmentHistory={[]}
        haptic={mockHaptic}
        onNavigateSettings={mockNavigate}
      />
    );
    expect(screen.getByText('Accountability Active')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('ON')).toBeInTheDocument();
  });

  it('shows punishment history when consent given and entries exist', () => {
    render(
      <ProfileAccountability
        punishmentSettings={activePunishmentSettings}
        punishmentHistory={punishmentHistory}
        haptic={mockHaptic}
        onNavigateSettings={mockNavigate}
      />
    );
    expect(screen.getByText('Recent Penalties')).toBeInTheDocument();
    expect(screen.getByText('Skipped workout')).toBeInTheDocument();
    expect(screen.getByText('-50 XP')).toBeInTheDocument();
    // Second entry has empty notes, falls back to punishment_type
    expect(screen.getByText('late')).toBeInTheDocument();
    expect(screen.getByText('-30 XP')).toBeInTheDocument();
  });

  it('shows off state and navigates on tap when no accountability', () => {
    render(
      <ProfileAccountability
        punishmentSettings={null}
        punishmentHistory={[]}
        haptic={mockHaptic}
        onNavigateSettings={mockNavigate}
      />
    );
    expect(screen.getByText('Accountability Off')).toBeInTheDocument();
    expect(screen.getByText(/Tap to enable in Settings/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /accountability is off/i }));
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
    expect(mockNavigate).toHaveBeenCalled();
  });
});
