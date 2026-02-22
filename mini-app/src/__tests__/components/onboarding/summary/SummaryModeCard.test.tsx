import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

import { SummaryFocusAreas, SummaryModeCards } from '@/components/onboarding/summary/SummaryModeCard';
import type { OnboardingData } from '@/hooks/useOnboarding';

describe('SummaryFocusAreas', () => {
  const mockOnEdit = vi.fn();

  it('renders focus area title and Edit button', () => {
    const data: OnboardingData = { selected_modes: ['fitness'] };
    render(<SummaryFocusAreas data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('Focus Areas')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('renders mode badges for selected modes', () => {
    const data: OnboardingData = { selected_modes: ['fitness', 'hydration'] };
    render(<SummaryFocusAreas data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText(/Fitness/)).toBeInTheDocument();
    expect(screen.getByText(/Hydration/)).toBeInTheDocument();
  });

  it('renders empty when no modes selected', () => {
    const data: OnboardingData = { selected_modes: [] };
    const { container } = render(<SummaryFocusAreas data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('Focus Areas')).toBeInTheDocument();
    // No mode badges rendered
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(0);
  });

  it('handles undefined selected_modes gracefully', () => {
    const data: OnboardingData = {};
    render(<SummaryFocusAreas data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('Focus Areas')).toBeInTheDocument();
  });

  it('calls onEdit with "paths" when Edit is clicked', () => {
    const data: OnboardingData = { selected_modes: ['fitness'] };
    render(<SummaryFocusAreas data={data} onEdit={mockOnEdit} />);

    fireEvent.click(screen.getByText('Edit'));
    expect(mockOnEdit).toHaveBeenCalledWith('paths');
  });

  it('renders unknown mode name as fallback', () => {
    const data: OnboardingData = { selected_modes: ['unknown_mode'] };
    render(<SummaryFocusAreas data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText(/unknown_mode/)).toBeInTheDocument();
  });
});

describe('SummaryModeCards', () => {
  const mockOnEdit = vi.fn();

  it('renders fitness card when fitness mode is selected', () => {
    const data: OnboardingData = {
      selected_modes: ['fitness'],
      fitness: { fitness_level: 'intermediate', workout_frequency: 4, focus_areas: ['arms', 'legs'] },
    };
    render(<SummaryModeCards data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText(/intermediate level/)).toBeInTheDocument();
    expect(screen.getByText(/4x\/week/)).toBeInTheDocument();
  });

  it('renders hydration card when hydration mode is selected', () => {
    const data: OnboardingData = {
      selected_modes: ['hydration'],
      hydration: { daily_target: 8, reminder_frequency: '2 hours' },
    };
    render(<SummaryModeCards data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('Hydration')).toBeInTheDocument();
    expect(screen.getByText(/8 glasses\/day/)).toBeInTheDocument();
    expect(screen.getByText(/every 2 hours/)).toBeInTheDocument();
  });

  it('renders nothing when no modes are selected', () => {
    const data: OnboardingData = { selected_modes: [] };
    const { container } = render(<SummaryModeCards data={data} onEdit={mockOnEdit} />);

    expect(container.innerHTML).toBe('');
  });

  it('does not render card for unselected mode even with data', () => {
    const data: OnboardingData = {
      selected_modes: ['fitness'],
      hydration: { daily_target: 8 },
    };
    render(<SummaryModeCards data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.queryByText('Hydration')).not.toBeInTheDocument();
  });

  it('renders null summary when mode data is missing', () => {
    const data: OnboardingData = {
      selected_modes: ['fitness'],
    };
    render(<SummaryModeCards data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('Fitness')).toBeInTheDocument();
  });

  it('calls onEdit with correct step for each mode', () => {
    const data: OnboardingData = {
      selected_modes: ['fitness', 'hydration'],
      fitness: { fitness_level: 'beginner' },
      hydration: { daily_target: 6 },
    };
    render(<SummaryModeCards data={data} onEdit={mockOnEdit} />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]); // fitness
    expect(mockOnEdit).toHaveBeenCalledWith('fitness_motivation');

    fireEvent.click(editButtons[1]); // hydration
    expect(mockOnEdit).toHaveBeenCalledWith('hydration_intake');
  });

  it('truncates focus_areas to 3 items in fitness summary', () => {
    const data: OnboardingData = {
      selected_modes: ['fitness'],
      fitness: { focus_areas: ['arms', 'legs', 'core', 'back', 'chest'] },
    };
    render(<SummaryModeCards data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText(/arms, legs, core/)).toBeInTheDocument();
    expect(screen.queryByText(/back/)).not.toBeInTheDocument();
  });
});
