import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock @twa-dev/sdk
vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'test',
    initDataUnsafe: { user: { id: 123, first_name: 'TestUser' } },
    ready: vi.fn(),
    expand: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableVerticalSwipes: vi.fn(),
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    colorScheme: 'dark',
    themeParams: {},
    platform: 'tdesktop',
    version: '7.0',
  },
}));

import { framerMotionMock } from '@/test/mocks/framer-motion';
vi.mock('framer-motion', () => framerMotionMock);

// Mock ProgressBar and ContinueButton
vi.mock('@/components/onboarding/ui/ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="progress-bar" data-progress={progress} />
  ),
}));

vi.mock('@/components/onboarding/ui/ContinueButton', () => ({
  ContinueButton: ({ onClick, disabled, label }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="continue-btn">
      {label || 'Continue'}
    </button>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Lock: () => <span data-testid="lock-icon" />,
}));

import { PathSelect } from '@/components/onboarding/PathSelect';

describe('PathSelect', () => {
  const mockOnSelect = vi.fn();
  const mockOnNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mode cards with icons and names', () => {
    render(
      <MemoryRouter>
        <PathSelect
          progress={0.2}
          onSelect={mockOnSelect}
          onNext={mockOnNext}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText('Hydration')).toBeInTheDocument();
    expect(screen.queryByText('Finance')).not.toBeInTheDocument();
    expect(screen.queryByText('Learning')).not.toBeInTheDocument();
  });

  it('clicking a mode toggles selection', () => {
    render(
      <MemoryRouter>
        <PathSelect
          progress={0.2}
          onSelect={mockOnSelect}
          onNext={mockOnNext}
        />
      </MemoryRouter>
    );

    // Click Fitness
    fireEvent.click(screen.getByText('Fitness'));
    expect(mockOnSelect).toHaveBeenCalledWith(['fitness']);

    // Click Hydration — both should now be selected
    fireEvent.click(screen.getByText('Hydration'));
    expect(mockOnSelect).toHaveBeenCalledWith(['fitness', 'hydration']);
  });

  it('shows selected state visually via className changes', () => {
    render(
      <MemoryRouter>
        <PathSelect
          progress={0.2}
          value={['fitness']}
          onSelect={mockOnSelect}
          onNext={mockOnNext}
        />
      </MemoryRouter>
    );

    // Fitness button should have the selected color class
    const fitnessButton = screen.getByText('Fitness').closest('button');
    expect(fitnessButton?.className).toContain('border-red-500');

    // Hydration button should NOT have selected color
    const hydrationButton = screen.getByText('Hydration').closest('button');
    expect(hydrationButton?.className).not.toContain('border-blue-500');
  });

  it('requires at least 1 mode selected for continue button', () => {
    render(
      <MemoryRouter>
        <PathSelect
          progress={0.2}
          onSelect={mockOnSelect}
          onNext={mockOnNext}
        />
      </MemoryRouter>
    );

    // With no selection, button should show "Select at least 1" and be disabled
    const continueBtn = screen.getByTestId('continue-btn');
    expect(continueBtn).toBeDisabled();
    expect(continueBtn).toHaveTextContent('Select at least 1');
  });

  it('enables continue button after selecting a mode', () => {
    render(
      <MemoryRouter>
        <PathSelect
          progress={0.2}
          value={['fitness']}
          onSelect={mockOnSelect}
          onNext={mockOnNext}
        />
      </MemoryRouter>
    );

    const continueBtn = screen.getByTestId('continue-btn');
    expect(continueBtn).not.toBeDisabled();
    expect(continueBtn).toHaveTextContent('Continue (1 selected)');
  });
});
