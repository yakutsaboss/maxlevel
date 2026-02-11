import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} role={props.role} aria-live={props['aria-live']}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="shield-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Check: () => <span data-testid="check-icon" />,
}));

import { AccountabilitySettings, type PunishmentSettings } from '@/components/settings/AccountabilitySettings';

const defaultPunishment: PunishmentSettings = {
  consent_given: false,
  intensity_level: 'medium',
  safe_mode: false,
};

const enabledPunishment: PunishmentSettings = {
  consent_given: true,
  intensity_level: 'medium',
  safe_mode: false,
};

describe('AccountabilitySettings', () => {
  const mockOnConsentToggle = vi.fn();
  const mockOnIntensityChange = vi.fn();
  const mockOnSafeModeToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders accountability partner section', () => {
    render(
      <AccountabilitySettings
        punishment={defaultPunishment}
        punishmentAvailable={true}
        onConsentToggle={mockOnConsentToggle}
        onIntensityChange={mockOnIntensityChange}
        onSafeModeToggle={mockOnSafeModeToggle}
        saveStatus="idle"
      />
    );

    expect(screen.getByText('Accountability')).toBeInTheDocument();
    expect(screen.getByText('Penalties for failed quests')).toBeInTheDocument();
  });

  it('renders consent toggle with correct aria state', () => {
    render(
      <AccountabilitySettings
        punishment={defaultPunishment}
        punishmentAvailable={true}
        onConsentToggle={mockOnConsentToggle}
        onIntensityChange={mockOnIntensityChange}
        onSafeModeToggle={mockOnSafeModeToggle}
        saveStatus="idle"
      />
    );

    const toggle = screen.getByRole('switch', { name: /accountability: off/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(mockOnConsentToggle).toHaveBeenCalled();
  });

  it('shows intensity selector when consent is enabled', () => {
    render(
      <AccountabilitySettings
        punishment={enabledPunishment}
        punishmentAvailable={true}
        onConsentToggle={mockOnConsentToggle}
        onIntensityChange={mockOnIntensityChange}
        onSafeModeToggle={mockOnSafeModeToggle}
        saveStatus="idle"
      />
    );

    expect(screen.getByText('Intensity Level')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Extreme')).toBeInTheDocument();
  });

  it('renders safe mode toggle when consent is enabled', () => {
    render(
      <AccountabilitySettings
        punishment={enabledPunishment}
        punishmentAvailable={true}
        onConsentToggle={mockOnConsentToggle}
        onIntensityChange={mockOnIntensityChange}
        onSafeModeToggle={mockOnSafeModeToggle}
        saveStatus="idle"
      />
    );

    expect(screen.getByText('Safe Mode')).toBeInTheDocument();
    const safeToggle = screen.getByRole('switch', { name: /safe mode: off/i });
    expect(safeToggle).toBeInTheDocument();
  });

  it('disabled state hides intensity and safe mode options', () => {
    render(
      <AccountabilitySettings
        punishment={defaultPunishment}
        punishmentAvailable={true}
        onConsentToggle={mockOnConsentToggle}
        onIntensityChange={mockOnIntensityChange}
        onSafeModeToggle={mockOnSafeModeToggle}
        saveStatus="idle"
      />
    );

    expect(screen.queryByText('Intensity Level')).not.toBeInTheDocument();
    expect(screen.queryByText('Safe Mode')).not.toBeInTheDocument();
  });
});
