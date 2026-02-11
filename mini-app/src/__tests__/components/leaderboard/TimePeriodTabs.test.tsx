import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimePeriodTabs } from '@/components/leaderboard/TimePeriodTabs';

const mockHaptic = { selection: vi.fn() };

describe('TimePeriodTabs', () => {
  it('renders all three time period options', () => {
    render(<TimePeriodTabs timePeriod="weekly" onSelect={vi.fn()} haptic={mockHaptic} />);

    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('marks the active tab with aria-selected=true', () => {
    render(<TimePeriodTabs timePeriod="monthly" onSelect={vi.fn()} haptic={mockHaptic} />);

    expect(screen.getByRole('tab', { name: 'Monthly leaderboard' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Weekly leaderboard' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'All Time leaderboard' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onSelect and haptic.selection when a tab is clicked', () => {
    const onSelect = vi.fn();
    const haptic = { selection: vi.fn() };
    render(<TimePeriodTabs timePeriod="weekly" onSelect={onSelect} haptic={haptic} />);

    fireEvent.click(screen.getByText('All Time'));

    expect(haptic.selection).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('all_time');
  });
});
