import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
  },
}));

// Mock ProgressBar and ContinueButton
vi.mock('@/components/onboarding/ui/ProgressBar', () => ({
  ProgressBar: ({ progress, stepLabel }: { progress: number; stepLabel?: string }) => (
    <div data-testid="progress-bar" data-progress={progress}>{stepLabel}</div>
  ),
}));

vi.mock('@/components/onboarding/ui/ContinueButton', () => ({
  ContinueButton: ({ onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="continue-btn">
      Continue
    </button>
  ),
}));

// Mock AnswerInput
vi.mock('@/components/onboarding/quiz/AnswerInput', () => ({
  AnswerInput: ({ config }: any) => (
    <div data-testid="answer-input" data-type={config.type}>
      Answer Input for {config.title}
    </div>
  ),
}));

// Mock useQuizState hook
const mockQuizState = {
  singleValue: '',
  multiValue: [] as string[],
  drumValue: 0,
  sliderValue: 1,
  daysValue: [] as string[],
  wakeTime: 7,
  sleepTime: 23,
  requiredDayCount: 0,
  isValid: true,
  handleSingleSelect: vi.fn(),
  handleMultiSelect: vi.fn(),
  handleDrumChange: vi.fn(),
  handleSliderChange: vi.fn(),
  handleDaysChange: vi.fn(),
  handleTimeChange: vi.fn(),
};

vi.mock('@/components/onboarding/quiz/useQuizState', () => ({
  useQuizState: () => mockQuizState,
}));

import { QuizScreen } from '@/components/onboarding/QuizScreen';
import type { QuestionConfig } from '@/data/onboardingQuestions';
import type { OnboardingData } from '@/hooks/useOnboarding';

describe('QuizScreen', () => {
  const mockOnAnswer = vi.fn();
  const mockOnNext = vi.fn();

  const singleSelectConfig: QuestionConfig = {
    step: 'fitness_motivation',
    title: 'What motivates you?',
    subtitle: 'Choose what drives your fitness journey',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'motivation',
    options: [
      { value: 'health', label: 'Better health' },
      { value: 'looks', label: 'Look better' },
      { value: 'energy', label: 'More energy' },
    ],
  };

  const testData: OnboardingData = {
    selected_modes: ['fitness'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuizState.isValid = true;
  });

  it('renders question title and subtitle', () => {
    render(
      <QuizScreen
        config={singleSelectConfig}
        progress={0.3}
        data={testData}
        onAnswer={mockOnAnswer}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText('What motivates you?')).toBeInTheDocument();
    expect(screen.getByText('Choose what drives your fitness journey')).toBeInTheDocument();
  });

  it('renders AnswerInput component with config', () => {
    render(
      <QuizScreen
        config={singleSelectConfig}
        progress={0.3}
        data={testData}
        onAnswer={mockOnAnswer}
        onNext={mockOnNext}
      />
    );

    const answerInput = screen.getByTestId('answer-input');
    expect(answerInput).toBeInTheDocument();
    expect(answerInput).toHaveAttribute('data-type', 'single-select');
  });

  it('renders progress bar with correct value', () => {
    render(
      <QuizScreen
        config={singleSelectConfig}
        progress={0.45}
        stepLabel="Fitness 2/12"
        data={testData}
        onAnswer={mockOnAnswer}
        onNext={mockOnNext}
      />
    );

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toHaveAttribute('data-progress', '0.45');
    expect(progressBar).toHaveTextContent('Fitness 2/12');
  });

  it('renders mode badge when provided', () => {
    render(
      <QuizScreen
        config={singleSelectConfig}
        progress={0.3}
        data={testData}
        modeBadge={{ icon: '🏋️', name: 'Fitness', color: 'bg-red-500/10 text-red-500' }}
        onAnswer={mockOnAnswer}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText(/Fitness/)).toBeInTheDocument();
  });

  it('disables continue when quiz state is invalid', () => {
    mockQuizState.isValid = false;

    render(
      <QuizScreen
        config={singleSelectConfig}
        progress={0.3}
        data={testData}
        onAnswer={mockOnAnswer}
        onNext={mockOnNext}
      />
    );

    const continueBtn = screen.getByTestId('continue-btn');
    expect(continueBtn).toBeDisabled();
  });
});
