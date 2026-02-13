import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Mode } from '@/types';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ArrowUpDown: () => <span data-testid="sort-icon" />,
}));

import { QuestFilters } from '@/components/quests/QuestFilters';

const mockModes: Mode[] = [
  { id: 1, name: 'fitness', display_name: 'Fitness', description: '', icon: '💪', is_active: true },
  { id: 2, name: 'learning', display_name: 'Learning', description: '', icon: '📚', is_active: true },
];

describe('QuestFilters', () => {
  const mockOnModeSelect = vi.fn();
  const mockOnSortChange = vi.fn();
  const mockOnDifficultySelect = vi.fn();
  const mockHaptic = { selection: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mode filter chips including All', () => {
    render(
      <QuestFilters
        modes={mockModes}
        selectedModeId={null}
        onModeSelect={mockOnModeSelect}
        selectedDifficulty={null}
        onDifficultySelect={mockOnDifficultySelect}
        sortBy="newest"
        onSortChange={mockOnSortChange}
        haptic={mockHaptic}
      />
    );

    // Two "All" buttons: mode filter + difficulty filter
    expect(screen.getAllByText('All')).toHaveLength(2);
    expect(screen.getByText(/Fitness/)).toBeInTheDocument();
    expect(screen.getByText(/Learning/)).toBeInTheDocument();
  });

  it('clicking a mode chip calls onModeSelect', () => {
    render(
      <QuestFilters
        modes={mockModes}
        selectedModeId={null}
        onModeSelect={mockOnModeSelect}
        selectedDifficulty={null}
        onDifficultySelect={mockOnDifficultySelect}
        sortBy="newest"
        onSortChange={mockOnSortChange}
        haptic={mockHaptic}
      />
    );

    fireEvent.click(screen.getByText(/Fitness/));
    expect(mockHaptic.selection).toHaveBeenCalled();
    expect(mockOnModeSelect).toHaveBeenCalledWith(1);
  });

  it('sort toggle renders with current sort label', () => {
    render(
      <QuestFilters
        modes={mockModes}
        selectedModeId={null}
        onModeSelect={mockOnModeSelect}
        selectedDifficulty={null}
        onDifficultySelect={mockOnDifficultySelect}
        sortBy="newest"
        onSortChange={mockOnSortChange}
        haptic={mockHaptic}
      />
    );

    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(screen.getByTestId('sort-icon')).toBeInTheDocument();
  });

  it('"All" chip is active by default (selectedModeId=null)', () => {
    render(
      <QuestFilters
        modes={mockModes}
        selectedModeId={null}
        onModeSelect={mockOnModeSelect}
        selectedDifficulty={null}
        onDifficultySelect={mockOnDifficultySelect}
        sortBy="newest"
        onSortChange={mockOnSortChange}
        haptic={mockHaptic}
      />
    );

    // First "All" is mode filter (active by default), second is difficulty filter
    const allButtons = screen.getAllByText('All');
    expect(allButtons[0].className).toContain('bg-telegram-link');
  });
});
