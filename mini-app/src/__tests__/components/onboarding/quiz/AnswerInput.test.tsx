import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { QuestionConfig } from '@/data/onboardingQuestions';

// Mock sub-components used by AnswerInput
vi.mock('@/components/onboarding/ui/DrumRoller', () => ({
  DrumRoller: ({ value, onChange, min, max }: any) => (
    <div data-testid="drum-roller" data-value={value}>
      <button onClick={() => onChange(value + 1)}>drum-change</button>
    </div>
  ),
}));

vi.mock('@/components/onboarding/ui/SliderInput', () => ({
  SliderInput: ({ value, onChange }: any) => (
    <div data-testid="slider-input" data-value={value}>
      <button onClick={() => onChange(value + 1)}>slider-change</button>
    </div>
  ),
}));

vi.mock('@/components/onboarding/ui/DaySelector', () => ({
  DaySelector: ({ selected, onChange }: any) => (
    <div data-testid="day-selector">
      <button onClick={() => onChange([...selected, 'Mon'])}>day-change</button>
    </div>
  ),
}));

vi.mock('@/components/onboarding/ui/DualTimePicker', () => ({
  DualTimePicker: ({ wakeTime, sleepTime, onWakeChange }: any) => (
    <div data-testid="dual-time-picker">
      <button onClick={() => onWakeChange(8)}>wake-change</button>
    </div>
  ),
}));

import { AnswerInput } from '@/components/onboarding/quiz/AnswerInput';

const defaultProps = {
  singleValue: '',
  multiValue: [] as string[],
  drumValue: 5,
  sliderValue: 5,
  daysValue: [] as string[],
  wakeTime: 7,
  sleepTime: 23,
  requiredDayCount: 3,
  onSingleSelect: vi.fn(),
  onMultiSelect: vi.fn(),
  onDrumChange: vi.fn(),
  onSliderChange: vi.fn(),
  onDaysChange: vi.fn(),
  onTimeChange: vi.fn(),
};

describe('AnswerInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders single-select options', () => {
    const config: QuestionConfig = {
      step: 'fitness_quiz' as any,
      title: 'Test',
      subtitle: 'Test sub',
      type: 'single-select',
      dataKey: 'test',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    };

    render(<AnswerInput {...defaultProps} config={config} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('calls onSingleSelect when a single-select option is clicked', () => {
    const config: QuestionConfig = {
      step: 'fitness_quiz' as any,
      title: 'Test',
      subtitle: 'Test sub',
      type: 'single-select',
      dataKey: 'test',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    };

    render(<AnswerInput {...defaultProps} config={config} />);
    fireEvent.click(screen.getByText('Option A'));
    expect(defaultProps.onSingleSelect).toHaveBeenCalledWith('a');
  });

  it('renders multi-select options', () => {
    const config: QuestionConfig = {
      step: 'fitness_quiz' as any,
      title: 'Test',
      subtitle: 'Test sub',
      type: 'multi-select',
      dataKey: 'test',
      options: [
        { value: 'x', label: 'Choice X' },
        { value: 'y', label: 'Choice Y' },
        { value: 'z', label: 'Choice Z' },
      ],
    };

    render(<AnswerInput {...defaultProps} config={config} />);
    expect(screen.getByText('Choice X')).toBeInTheDocument();
    expect(screen.getByText('Choice Y')).toBeInTheDocument();
    expect(screen.getByText('Choice Z')).toBeInTheDocument();
  });

  it('renders drum-roller for drum-roller type', () => {
    const config: QuestionConfig = {
      step: 'fitness_quiz' as any,
      title: 'Test',
      subtitle: 'Test sub',
      type: 'drum-roller',
      dataKey: 'test',
      min: 1,
      max: 10,
    };

    render(<AnswerInput {...defaultProps} config={config} />);
    expect(screen.getByTestId('drum-roller')).toBeInTheDocument();
  });

  it('renders slider for slider type', () => {
    const config: QuestionConfig = {
      step: 'fitness_quiz' as any,
      title: 'Test',
      subtitle: 'Test sub',
      type: 'slider',
      dataKey: 'test',
      min: 0,
      max: 10,
    };

    render(<AnswerInput {...defaultProps} config={config} />);
    expect(screen.getByTestId('slider-input')).toBeInTheDocument();
  });

  it('renders day-grid for day-grid type', () => {
    const config: QuestionConfig = {
      step: 'fitness_quiz' as any,
      title: 'Test',
      subtitle: 'Test sub',
      type: 'day-grid',
      dataKey: 'test',
    };

    render(<AnswerInput {...defaultProps} config={config} />);
    expect(screen.getByTestId('day-selector')).toBeInTheDocument();
  });

  it('renders dual-time picker for dual-time type', () => {
    const config: QuestionConfig = {
      step: 'fitness_quiz' as any,
      title: 'Test',
      subtitle: 'Test sub',
      type: 'dual-time',
      dataKey: 'test',
    };

    render(<AnswerInput {...defaultProps} config={config} />);
    expect(screen.getByTestId('dual-time-picker')).toBeInTheDocument();
  });
});
